import { useEffect, useMemo, useState } from "react"
import type { GrammarState } from "shiki/core"

import { loadHighlighter, type Highlighter } from "@/lib/highlighter"

type Highlighted = {
  highlighter: Highlighter | null
  /** The complete lines that are highlighted, including their newlines. */
  text: string
  lines: React.ReactNode[]
  state?: GrammarState
}

const empty = { text: "", lines: [] }

/**
 * Highlights code that may still be streaming in. Complete lines are only
 * tokenized once, continuing from the grammar state of the line before;
 * just the unfinished last line is tokenized again on every render.
 */
export function useHighlightedCode(value: string, language: string) {
  // A trailing newline would render as an extra empty line.
  const code = value.endsWith("\n") ? value.slice(0, -1) : value
  const highlighter = useHighlighter(language)

  const [done, setDone] = useState<Highlighted>({ highlighter, ...empty })
  let next = done

  // Start over when the code was replaced rather than extended.
  if (next.highlighter !== highlighter || !code.startsWith(next.text)) {
    next = { highlighter, ...empty }
  }

  const end = code.lastIndexOf("\n") + 1
  if (highlighter && end > next.text.length) {
    const added = highlighter.highlight(
      code.slice(next.text.length, end - 1),
      next.state
    )
    next = {
      highlighter,
      text: code.slice(0, end),
      lines: [...next.lines, ...added.lines],
      state: added.state,
    }
  }

  if (next !== done) setDone(next)

  const tail = code.slice(end)
  return useMemo(() => {
    if (!highlighter) return code.split("\n")
    return [...next.lines, highlighter.highlight(tail, next.state).lines[0]]
  }, [code, highlighter, next, tail])
}

/** The highlighter for a language, or null while loading or if unsupported. */
function useHighlighter(language: string) {
  const [loaded, setLoaded] = useState<{
    language: string
    highlighter: Highlighter | null
  }>()

  useEffect(() => {
    let cancelled = false
    loadHighlighter(language)
      .then((highlighter) => {
        if (!cancelled) setLoaded({ language, highlighter })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [language])

  return loaded?.language === language ? loaded.highlighter : null
}
