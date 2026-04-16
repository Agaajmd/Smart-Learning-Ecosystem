import { Fragment } from "react"
import { cn } from "@/lib/utils"

interface FormattedChatTextProps {
  text?: string
  className?: string
}

const BOLD_TOKEN_REGEX = /(\*\*[^*\n][^*\n]*\*\*|\*[^*\n][^*\n]*\*)/g

function renderLineWithBold(line: string, lineIndex: number) {
  const parts = line.split(BOLD_TOKEN_REGEX)

  return parts.map((part, segmentIndex) => {
    if (!part) return null

    const isDoubleBold = part.startsWith("**") && part.endsWith("**") && part.length > 4
    if (isDoubleBold) {
      return (
        <strong key={`line-${lineIndex}-segment-${segmentIndex}`}>
          {part.slice(2, -2)}
        </strong>
      )
    }

    const isSingleBold = part.startsWith("*") && part.endsWith("*") && !part.startsWith("**") && part.length > 2
    if (isSingleBold) {
      return (
        <strong key={`line-${lineIndex}-segment-${segmentIndex}`}>
          {part.slice(1, -1)}
        </strong>
      )
    }

    return <Fragment key={`line-${lineIndex}-segment-${segmentIndex}`}>{part}</Fragment>
  })
}

export function FormattedChatText({ text, className }: FormattedChatTextProps) {
  const normalized = String(text || "").replace(/\r\n/g, "\n")
  const lines = normalized.split("\n")

  return (
    <p className={cn("whitespace-pre-wrap break-words leading-relaxed", className)}>
      {lines.map((line, lineIndex) => (
        <Fragment key={`line-${lineIndex}`}>
          {renderLineWithBold(line, lineIndex)}
          {lineIndex < lines.length - 1 ? "\n" : null}
        </Fragment>
      ))}
    </p>
  )
}
