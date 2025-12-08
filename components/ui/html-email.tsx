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
          let sanitized = DOMPurify.sanitize(content, config)

          // Fix inline color styles that don't work well with the theme
          // Remove or override problematic color styles
          const tempDiv = document.createElement('div')
          tempDiv.innerHTML = sanitized

          // Find all elements with inline styles
          const elementsWithStyle = tempDiv.querySelectorAll('[style]')
          elementsWithStyle.forEach((el) => {
            const style = (el as HTMLElement).style

            // Remove or reset problematic color properties
            if (style.color) {
              // Check if it's a very light color (white or near-white)
              const color = style.color
              const isVeryLightColor =
                color.includes('white') ||
                color.includes('#fff') ||
                color.includes('#FFF') ||
                /^#[f]{6}$/i.test(color) ||
                /rgb\(\s*(?:24[0-9]|25[0-5])\s*,\s*(?:24[0-9]|25[0-5])\s*,\s*(?:24[0-9]|25[0-5])\s*\)/i.test(color)

              // Only remove white/near-white colors, keep gray and other colors for readability
              if (isVeryLightColor) {
                style.removeProperty('color')
              }
            }

            // Remove ALL background colors for consistency
            if (style.backgroundColor) {
              style.removeProperty('background-color')
            }
            if (style.background) {
              style.removeProperty('background')
            }

            // Remove border styles that make emails look messy
            if (style.border || style.borderWidth || style.borderColor || style.borderStyle) {
              style.removeProperty('border')
              style.removeProperty('border-width')
              style.removeProperty('border-color')
              style.removeProperty('border-style')
              style.removeProperty('border-top')
              style.removeProperty('border-bottom')
              style.removeProperty('border-left')
              style.removeProperty('border-right')
            }
          })

          // Remove border and background attributes from all elements
          const tablesAndCells = tempDiv.querySelectorAll('table, td, th, tr')
          tablesAndCells.forEach((el) => {
            el.removeAttribute('border')
            el.removeAttribute('cellpadding')
            el.removeAttribute('cellspacing')
            el.removeAttribute('bgcolor')
          })

          // Remove bgcolor from all other elements too
          const allElements = tempDiv.querySelectorAll('[bgcolor]')
          allElements.forEach((el) => {
            el.removeAttribute('bgcolor')
          })

          sanitized = tempDiv.innerHTML
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
    <>
      <style jsx>{`
        .email-content :global(table) {
          border-collapse: collapse !important;
          border: none !important;
          background: transparent !important;
        }
        .email-content :global(td),
        .email-content :global(th) {
          border: none !important;
          padding: 4px 8px;
          background: transparent !important;
        }
        .email-content :global(tr) {
          border: none !important;
          background: transparent !important;
        }
        .email-content :global(div),
        .email-content :global(span),
        .email-content :global(p) {
          background: transparent !important;
        }
        .email-content :global(img) {
          max-width: 100%;
          height: auto;
        }
      `}</style>
      <div
        className={`email-content text-sm leading-relaxed ${className}`}
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        style={{
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
        }}
      />
    </>
  )
}
