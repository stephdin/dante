import { defaultComponents, Streamdown, type Components } from "streamdown"

import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockLine,
  CodeBlockTitle,
} from "@/components/ui/code-block"
import { useHighlightedCode } from "@/hooks/use-highlighted-code"

// Markdown for assistant replies. While streaming, Streamdown completes
// unfinished syntax (open code fences, half-written bold, …) so the output
// doesn't flicker; finished messages are rendered in static mode.
export function Markdown({
  children,
  streaming = false,
}: {
  children: string
  streaming?: boolean
}) {
  return (
    <Streamdown
      mode={streaming ? "streaming" : "static"}
      isAnimating={streaming}
      components={components}
    >
      {children}
    </Streamdown>
  )
}

// Streamdown passes both inline and fenced code to `code`; fenced blocks are
// marked with `data-block`. Those go to our Code Block, inline code keeps
// Streamdown's default.
const components: Components = {
  code: (props) => {
    if (!("data-block" in props)) {
      const InlineCode = defaultComponents.code
      return <InlineCode {...props} />
    }

    const language = /language-(\S+)/.exec(props.className ?? "")?.[1] ?? ""
    return (
      <MarkdownCodeBlock
        code={String(props.children ?? "")}
        language={language}
      />
    )
  },
}

function MarkdownCodeBlock({
  code,
  language,
}: {
  code: string
  language: string
}) {
  const lines = useHighlightedCode(code, language)

  return (
    <CodeBlock>
      <CodeBlockHeader>
        <CodeBlockTitle>{language || "Code"}</CodeBlockTitle>
        <CodeBlockActions>
          <CodeBlockCopyButton value={code} />
        </CodeBlockActions>
      </CodeBlockHeader>
      <CodeBlockContent lineNumbers>
        {lines.map((line, index) => (
          <CodeBlockLine key={index}>{line}</CodeBlockLine>
        ))}
      </CodeBlockContent>
    </CodeBlock>
  )
}
