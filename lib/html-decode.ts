/**
 * Decode HTML entities in text
 * Handles common entities like &#39;, &quot;, &amp;, etc.
 * Uses browser's native parser for accurate decoding
 */
export function decodeHtmlEntities(text: string | null | undefined): string {
  if (!text) return ""
  
  // Use browser's native HTML parser to decode entities
  if (typeof window !== 'undefined') {
    const textarea = document.createElement('textarea')
    textarea.innerHTML = text
    return textarea.value
  }
  
  // Fallback for server-side rendering
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#34;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&#x27;': "'",
    '&nbsp;': ' ',
    '&#160;': ' ',
  }

  let decoded = text

  // Replace named entities
  Object.keys(entities).forEach(entity => {
    decoded = decoded.replace(new RegExp(entity, 'g'), entities[entity])
  })

  // Replace numeric decimal entities (e.g., &#8217;, &#39;)
  decoded = decoded.replace(/&#(\d+);/g, (match, dec) => {
    return String.fromCharCode(parseInt(dec, 10))
  })

  // Replace numeric hex entities (e.g., &#x2019;)
  decoded = decoded.replace(/&#x([0-9a-f]+);/gi, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16))
  })

  return decoded
}
