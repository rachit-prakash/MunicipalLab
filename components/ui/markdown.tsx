import * as React from 'react'

interface MarkdownProps {
  children: string
}

/**
 * Simple markdown renderer for chatbot messages
 * Supports: **bold**, *italic*, lists, and line breaks
 */
export function Markdown({ children }: MarkdownProps) {
  const renderContent = (text: string) => {
    // Split by lines to handle lists and paragraphs
    const lines = text.split('\n')
    const elements: React.ReactNode[] = []
    let currentParagraph: string[] = []
    let inList = false

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        elements.push(
          <p key={elements.length} className="my-2">
            {formatInlineMarkdown(currentParagraph.join('\n'))}
          </p>
        )
        currentParagraph = []
      }
    }

    lines.forEach((line, idx) => {
      const trimmedLine = line.trim()

      // Handle list items
      if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        if (!inList) {
          flushParagraph()
          inList = true
        }
        const listText = trimmedLine.slice(2)
        elements.push(
          <li key={elements.length} className="ml-4">
            {formatInlineMarkdown(listText)}
          </li>
        )
      } else if (trimmedLine === '') {
        // Empty line
        if (inList) {
          inList = false
        } else {
          flushParagraph()
        }
      } else {
        // Regular line
        if (inList) {
          inList = false
        }
        currentParagraph.push(line)
      }
    })

    flushParagraph()
    return elements
  }

  const formatInlineMarkdown = (text: string) => {
    const parts: React.ReactNode[] = []
    let currentText = text
    let key = 0

    // Process **bold** and *italic*
    const regex = /(\*\*.*?\*\*|\*.*?\*)/g
    let lastIndex = 0
    let match

    while ((match = regex.exec(currentText)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(currentText.slice(lastIndex, match.index))
      }

      const matched = match[0]
      if (matched.startsWith('**') && matched.endsWith('**')) {
        // Bold
        parts.push(
          <strong key={key++} className="font-semibold">
            {matched.slice(2, -2)}
          </strong>
        )
      } else if (matched.startsWith('*') && matched.endsWith('*')) {
        // Italic
        parts.push(
          <em key={key++} className="italic">
            {matched.slice(1, -1)}
          </em>
        )
      }

      lastIndex = regex.lastIndex
    }

    // Add remaining text
    if (lastIndex < currentText.length) {
      parts.push(currentText.slice(lastIndex))
    }

    return parts.length > 0 ? parts : text
  }

  return <div className="text-sm leading-relaxed">{renderContent(children)}</div>
}


