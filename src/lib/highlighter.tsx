import {
  createHighlighterCore,
  type GrammarState,
  type HighlighterCore,
} from "shiki/core"
import { createJavaScriptRegexEngine } from "shiki/engine/javascript"

// Add the languages you need. Each one loads the first time it is used.
const languages = {
  bash: () => import("shiki/langs/shellscript.mjs"),
  css: () => import("shiki/langs/css.mjs"),
  diff: () => import("shiki/langs/diff.mjs"),
  html: () => import("shiki/langs/html.mjs"),
  javascript: () => import("shiki/langs/javascript.mjs"),
  json: () => import("shiki/langs/json.mjs"),
  jsx: () => import("shiki/langs/jsx.mjs"),
  markdown: () => import("shiki/langs/markdown.mjs"),
  python: () => import("shiki/langs/python.mjs"),
  sql: () => import("shiki/langs/sql.mjs"),
  tsx: () => import("shiki/langs/tsx.mjs"),
  typescript: () => import("shiki/langs/typescript.mjs"),
  yaml: () => import("shiki/langs/yaml.mjs"),
}

type Language = keyof typeof languages

const aliases: Record<string, Language> = {
  js: "javascript",
  md: "markdown",
  py: "python",
  sh: "bash",
  shell: "bash",
  shellscript: "bash",
  ts: "typescript",
  yml: "yaml",
  zsh: "bash",
}

let shikiCore: Promise<HighlighterCore> | undefined

function getShiki() {
  shikiCore ??= createHighlighterCore({
    themes: [
      import("shiki/themes/github-light.mjs"),
      import("shiki/themes/github-dark.mjs"),
    ],
    langs: [],
    engine: createJavaScriptRegexEngine({ forgiving: true }),
  })
  return shikiCore
}

// ANSI is built into Shiki, so it needs no grammar.
function resolveLanguage(language: string): Language | "ansi" | undefined {
  const name = language.toLowerCase()
  if (name === "ansi") return name
  return name in languages ? (name as Language) : aliases[name]
}

export type Highlighter = NonNullable<
  Awaited<ReturnType<typeof loadHighlighter>>
>

/** Loads a language and returns a highlighter for it, or null if unsupported. */
export async function loadHighlighter(language: string) {
  const lang = resolveLanguage(language)
  if (!lang) return null

  const shiki = await getShiki()
  if (lang !== "ansi" && !shiki.getLoadedLanguages().includes(lang)) {
    await shiki.loadLanguage(languages[lang])
  }

  const tokenize = (code: string, state?: GrammarState) =>
    shiki.codeToTokens(code, {
      lang,
      themes: { light: "github-light", dark: "github-dark" },
      defaultColor: false,
      grammarState: state,
    }).tokens

  return {
    /**
     * Returns one React node per line, and the grammar state after the last
     * line. Pass that state back in to continue where the code left off.
     */
    highlight(code: string, state?: GrammarState) {
      // ANSI has no grammar state, so each line is tokenized on its own and
      // gets the same colors whether it arrives in one piece or streams.
      const tokens =
        lang === "ansi"
          ? code.split("\n").flatMap((line) => tokenize(line))
          : tokenize(code, state)

      return {
        lines: tokens.map((line) =>
          line.map((token, index) => (
            <span
              key={index}
              style={token.htmlStyle as React.CSSProperties}
              className="text-(--shiki-light) dark:text-(--shiki-dark)"
            >
              {token.content}
            </span>
          ))
        ),
        state: shiki.getLastGrammarState(tokens),
      }
    },
  }
}
