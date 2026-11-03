import { dynamicTool, type ToolSet } from "ai"
import { z } from "zod"

// https://tagesschau.api.bund.dev — private, non-commercial use is allowed,
// at most 60 requests per hour.
const BASE = "https://www.tagesschau.de/api2u/"
const MAX_REQUESTS_PER_HOUR = 50
const LIST_TTL = 5 * 60 * 1000
const ARTICLE_TTL = 60 * 60 * 1000
const MAX_ITEMS = 10
const MAX_ARTICLE_LENGTH = 6000

const RESSORTS = [
  "inland",
  "ausland",
  "wirtschaft",
  "sport",
  "investigativ",
  "wissen",
] as const

// The API numbers the states alphabetically, starting at 1.
const STATES = [
  "Baden-Württemberg",
  "Bayern",
  "Berlin",
  "Brandenburg",
  "Bremen",
  "Hamburg",
  "Hessen",
  "Mecklenburg-Vorpommern",
  "Niedersachsen",
  "Nordrhein-Westfalen",
  "Rheinland-Pfalz",
  "Saarland",
  "Sachsen",
  "Sachsen-Anhalt",
  "Schleswig-Holstein",
  "Thüringen",
] as const

export const tagesschauTools = (): ToolSet => ({
  tagesschau_news: dynamicTool({
    title: "Tagesschau",
    description:
      "Current news headlines from tagesschau.de, the main news service " +
      "of the German broadcaster ARD, newest first. It covers Germany and " +
      "the whole world (ressort ausland), so use it for any question about " +
      "current events, in any country. Optionally filter by ressort or " +
      "German state, or search for a topic in the last 30 days. If a " +
      "search finds nothing relevant, try the unfiltered headlines. " +
      "Returns short teasers; use tagesschau_article for the full text. " +
      "Only report what the teasers say and don't make up summaries.",
    inputSchema: z.object({
      ressort: z.enum(RESSORTS).optional(),
      state: z
        .enum(STATES)
        .optional()
        .describe("German state for regional news"),
      query: z
        .string()
        .optional()
        .describe("Search term, e.g. Rente. Ignores ressort and state."),
    }),
    execute: async (input) => {
      const { ressort, state, query } = input as {
        ressort?: string
        state?: (typeof STATES)[number]
        query?: string
      }
      try {
        return { articles: await headlines({ ressort, state, query }) }
      } catch (error) {
        return { error: (error as Error).message }
      }
    },
  }),

  tagesschau_article: dynamicTool({
    title: "Tagesschau-Artikel",
    description:
      "The full text of a tagesschau.de article. Pass the id from " +
      "tagesschau_news.",
    inputSchema: z.object({ id: z.string() }),
    execute: async (input) => {
      const { id } = input as { id: string }
      try {
        return await article(id)
      } catch (error) {
        return { error: (error as Error).message }
      }
    },
  }),
})

type Teaser = {
  title?: string
  topline?: string
  firstSentence?: string
  date?: string
  type?: string
  details?: string
  shareURL?: string
}

async function headlines({
  ressort,
  state,
  query,
}: {
  ressort?: string
  state?: (typeof STATES)[number]
  query?: string
}) {
  let teasers: Teaser[]
  if (query?.trim()) {
    const params = new URLSearchParams({
      searchText: query.trim(),
      pageSize: String(MAX_ITEMS * 2),
    })
    const data = await get<{ searchResults?: Teaser[] }>(
      `search/?${params}`,
      LIST_TTL
    )
    teasers = data.searchResults ?? []
  } else {
    const params = new URLSearchParams()
    if (ressort) params.set("ressort", ressort)
    if (state) params.set("regions", String(STATES.indexOf(state) + 1))
    // With a state, its stories come in `news` too.
    const data = await get<{ news?: Teaser[] }>(`news/?${params}`, LIST_TTL)
    teasers = data.news ?? []
  }

  // Videos have no text to read, so only stories with details make the list.
  return teasers
    .filter((teaser) => teaser.type === "story" && teaser.details)
    .slice(0, MAX_ITEMS)
    .map((teaser) => ({
      id: articleId(teaser.details!),
      title: teaser.title,
      topline: teaser.topline,
      // Regional stories come without one; saying so keeps the model from
      // inventing a summary to fill the gap.
      summary: teaser.firstSentence?.trim() || "(no summary, title only)",
      date: teaser.date?.slice(0, 16).replace("T", " "),
      url: teaser.shareURL,
    }))
}

async function article(id: string) {
  // Only paths below the API, so the model can't make us fetch anything else.
  if (!/^[a-z0-9-]+(\/[a-z0-9-]+)*$/.test(id)) {
    throw new Error("invalid id, use one from tagesschau_news")
  }
  const data = await get<
    Teaser & { content?: { type: string; value?: string }[] }
  >(`${id}.json`, ARTICLE_TTL)

  const text = (data.content ?? [])
    .filter((block) => block.type === "text" || block.type === "headline")
    .map((block) => plainText(block.value ?? ""))
    .filter(Boolean)
    .join("\n\n")
  return {
    title: data.title,
    date: data.date?.slice(0, 16).replace("T", " "),
    url: data.shareURL,
    text:
      text.length > MAX_ARTICLE_LENGTH
        ? `${text.slice(0, MAX_ARTICLE_LENGTH)}…`
        : text,
  }
}

/** "https://…/api2u/inland/rente-100.json" → "inland/rente-100" */
function articleId(detailsUrl: string) {
  return detailsUrl.replace(BASE, "").replace(/\.json$/, "")
}

function plainText(html: string) {
  return (
    html
      // Keep list items and line breaks apart before the tags go.
      .replace(/<li[^>]*>/g, "\n- ")
      .replace(/<br\s*\/?>/g, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&quot;/g, '"')
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
      .replace(/&amp;/g, "&")
      .trim()
  )
}

// ── Cache and rate limit, shared by all runs ─────────────────────────────

const cache = new Map<string, { expires: number; data: unknown }>()
const requestTimes: number[] = []

async function get<T>(path: string, ttl: number): Promise<T> {
  const now = Date.now()
  const cached = cache.get(path)
  if (cached && cached.expires > now) return cached.data as T

  while (requestTimes.length > 0 && requestTimes[0] < now - 60 * 60 * 1000) {
    requestTimes.shift()
  }
  if (requestTimes.length >= MAX_REQUESTS_PER_HOUR) {
    throw new Error("hourly request limit for tagesschau.de reached")
  }
  requestTimes.push(now)

  const response = await fetch(BASE + path, {
    headers: { "User-Agent": "Dante (private chat assistant)" },
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) throw new Error(`tagesschau.de: ${response.status}`)
  const data = (await response.json()) as T

  for (const [key, entry] of cache) {
    if (entry.expires <= now) cache.delete(key)
  }
  cache.set(path, { expires: now + ttl, data })
  return data
}
