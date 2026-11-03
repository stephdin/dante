import { dynamicTool } from "ai"
import { z } from "zod"
import type { ConversationStore } from "../../store/store.ts"
import { messageText } from "../message-text.ts"

const MAX_RESULTS = 5
const MAX_EXCERPTS = 4
// Answers get more room: they hold what the user wants back, while the
// question only has to be recognizable.
const EXCERPT_LENGTH = { user: 400, assistant: 1000 }

// Too common to tell chats apart.
const STOPWORDS = new Set(
  (
    "der die das den dem des ein eine einen und oder aber mit für von zu " +
    "im in an auf ist sind war wie was wir ich du mal doch nochmal " +
    "the a an and or but of to in on is are was how what we i you"
  ).split(" ")
)

export const searchChatsTool = ({
  store,
  conversationId,
}: {
  store: ConversationStore
  conversationId: string
}) =>
  dynamicTool({
    title: "Chats durchsuchen",
    description:
      "Searches the user's earlier conversations by keywords and returns " +
      "the best matches with their date and text snippets. Only use it " +
      "when the user explicitly refers to an earlier conversation, e.g. " +
      '"we talked about", "last time" or "you told me". Never use it for ' +
      "new questions.",
    inputSchema: z.object({
      query: z
        .string()
        .describe("A few keywords, in the language the chats are in"),
    }),
    execute: async (input) => {
      const { query } = input as { query: string }
      return searchChats(store, conversationId, query)
    },
  })

/**
 * Ranks chats by how many of the keywords they contain, newer chats first
 * on a tie. Scans every chat, which is plenty fast for one person's history.
 */
function searchChats(
  store: ConversationStore,
  excludeId: string,
  query: string
) {
  const patterns = keywords(query).map(wordStart)
  if (patterns.length === 0) return { error: "query has no keywords" }

  const results = []
  // The list comes newest first, and the sort below keeps that order on ties.
  for (const summary of store.list()) {
    if (summary.id === excludeId) continue
    const conversation = store.get(summary.id)
    if (!conversation) continue

    const texts = conversation.messages.map((message) => ({
      role: message.role,
      text: messageText(message),
    }))
    const matched = patterns.filter(
      (pattern) =>
        pattern.test(conversation.title) ||
        texts.some(({ text }) => pattern.test(text))
    )
    if (matched.length === 0) continue

    results.push({
      score: matched.length,
      result: {
        title: conversation.title,
        date: conversation.updatedAt.slice(0, 10),
        excerpts: excerpts(texts, matched),
      },
    })
  }

  results.sort((a, b) => b.score - a.score)
  return { results: results.slice(0, MAX_RESULTS).map((r) => r.result) }
}

function keywords(query: string) {
  const words = query.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []
  return [
    ...new Set(words.filter((word) => word.length > 1 && !STOPWORDS.has(word))),
  ]
}

/** Matches at the start of a word: "puffer" finds "Pufferzeiten". */
function wordStart(keyword: string) {
  // Keywords are letters and digits only, so they need no escaping.
  return new RegExp(`(?<![\\p{L}\\p{N}])${keyword}`, "iu")
}

/**
 * The messages that contain a keyword, plus the start of the answer to a
 * matching question, since the answer is usually what the user is after.
 * Falls back to the first exchange when only the title matched.
 */
function excerpts(texts: { role: string; text: string }[], patterns: RegExp[]) {
  const matching = texts.flatMap(({ text }, index) =>
    patterns.some((pattern) => pattern.test(text)) ? [index] : []
  )
  const picked = new Set<number>()
  for (const index of matching.length > 0 ? matching : [0]) {
    picked.add(index)
    const reply = texts[index + 1]
    if (texts[index].role === "user" && reply?.role === "assistant") {
      picked.add(index + 1)
    }
  }
  return [...picked]
    .sort((a, b) => a - b)
    .slice(0, MAX_EXCERPTS)
    .map((index) => ({
      role: texts[index].role,
      text: excerpt(
        texts[index].text,
        patterns,
        texts[index].role === "user"
          ? EXCERPT_LENGTH.user
          : EXCERPT_LENGTH.assistant
      ),
    }))
}

/** A piece of the text that starts a bit before the first keyword. */
function excerpt(text: string, patterns: RegExp[], length: number) {
  const positions = patterns
    .map((pattern) => text.search(pattern))
    .filter((position) => position !== -1)
  const first = positions.length > 0 ? Math.min(...positions) : 0
  const start = Math.max(0, first - length / 4)
  const end = Math.min(text.length, start + length)
  const piece = text.slice(start, end).replace(/\s+/g, " ").trim()
  return `${start > 0 ? "…" : ""}${piece}${end < text.length ? "…" : ""}`
}
