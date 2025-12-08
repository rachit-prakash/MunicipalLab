"use client"

import * as React from 'react'
import { decodeHtmlEntities } from '@/lib/html-decode'

interface HtmlEmailProps {
  content: string
  className?: string
}

/**
 * Safely renders HTML email content with sanitization
 * Preserves original email formatting including styles, links, images, etc.
 */
export function HtmlEmail({ content, className = "" }: HtmlEmailProps) {
  const [sanitizedHtml, setSanitizedHtml] = React.useState("")
  const [isReady, setIsReady] = React.useState(false)

  // Process content on client side
  React.useEffect(() => {
    if (typeof window === 'undefined' || !content) return

    const processContent = async () => {
      try {
        // Use a more robust entity decoding approach
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = content
        const initialDecoded = tempDiv.textContent || tempDiv.innerText || content
        
        // Now check if the original content had HTML tags
        const isHtml = /<[a-z][\s\S]*>/i.test(content)

        if (isHtml) {
          // Load DOMPurify and sanitize HTML
          const DOMPurify = (await import('isomorphic-dompurify')).default

          const config = {
            ALLOWED_TAGS: [
              'p', 'br', 'span', 'div', 'a', 'strong', 'b', 'em', 'i', 'u',
              'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
              'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
              'table', 'thead', 'tbody', 'tr', 'th', 'td',
              'img', 'hr', 'small', 'sub', 'sup', 'mark', 'font',
              'center', 'style',
            ],
            ALLOWED_ATTR: [
              'href', 'title', 'target', 'rel', 'class', 'id',
              'src', 'alt', 'width', 'height', 'style',
              'colspan', 'rowspan', 'align', 'valign',
              'color', 'bgcolor', 'border', 'cellpadding', 'cellspacing',
            ],
            ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
            KEEP_CONTENT: true,
            ADD_ATTR: ['target'],
            RETURN_DOM: false,
            RETURN_DOM_FRAGMENT: false,
          }

          // Sanitize the original content (with entities)
          const sanitized = DOMPurify.sanitize(content, config)
          setSanitizedHtml(sanitized)
        } else {
          // Plain text - decode entities and convert newlines to <br>
          const textWithBreaks = initialDecoded.replace(/\n/g, '<br>')
          setSanitizedHtml(textWithBreaks)
        }

        setIsReady(true)
      } catch (err) {
        console.error('Failed to process email content:', err)
        // Fallback: show decoded plain text
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = content
        const fallbackText = (tempDiv.textContent || content).replace(/\n/g, '<br>')
        setSanitizedHtml(fallbackText)
        setIsReady(true)
      }
    }

    processContent()
  }, [content])

  if (!content) {
    return null
  }

  // Show loading state while processing
  if (!isReady) {
    return (
      <div className={`text-sm leading-relaxed animate-pulse ${className}`}>
        <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-muted rounded w-full mb-2"></div>
        <div className="h-4 bg-muted rounded w-5/6"></div>
      </div>
    )
  }

  return (
    <div
      className={`email-content text-sm leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      style={{
        wordWrap: 'break-word',
        overflowWrap: 'break-word',
      }}
    />
  )
}
