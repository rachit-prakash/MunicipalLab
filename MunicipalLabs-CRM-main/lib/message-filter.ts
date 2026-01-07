/**
 * Smart Message Filter
 *
 * Two-stage classification system:
 * 1. Rule-based filtering (this file): Fast, catches obvious cases
 * 2. AI classification (lib/analysis.ts): Handles edge cases with high accuracy
 *
 * This filter provides quick classification for clear cases. For ambiguous cases
 * (low confidence < 0.7), the AI classifier in analysis.ts makes the final decision.
 * The AI result (senderType) is stored in the database and takes priority in folders.ts.
 *
 * This hybrid approach balances speed, cost, and accuracy.
 */

export type MessageType =
  | "personal"        // Real person, analyze this!
  | "automated"       // Bot/system, skip analysis
  | "marketing"       // Promotional, skip analysis
  | "transactional"   // Receipt/confirmation, skip analysis
  | "notification"    // Alert/update, skip analysis

export interface FilterResult {
  type: MessageType
  shouldAnalyze: boolean
  reason: string
  confidence: number  // 0-1, how confident we are in classification
}

/**
 * Filters that identify emails we should SKIP analyzing
 */
const SKIP_PATTERNS = {
  // No-reply addresses (100% skip)
  noReply: [
    /^no-?reply@/i,
    /^do-?not-?reply@/i,
    /^noreply@/i,
    /notifications@/i,
    /alerts@/i,
    /automated@/i,
    /system@/i,
  ],

  // Bot accounts (100% skip)
  bots: [
    /\[bot\]/i,
    /<bot>/i,
    /^bot@/i,
    /github-actions/i,
    /dependabot/i,
    /renovate\[bot\]/i,
  ],

  // Marketing/team emails (95% skip)
  marketing: [
    /^marketing@/i,
    /^newsletter@/i,
    /^updates@/i,
    /^news@/i,
    /^promo/i,
    /^team@/i,
    /hello@/i,
    /support@/i,
  ],

  // Transactional (90% skip)
  transactional: [
    /^receipts?@/i,
    /^billing@/i,
    /^invoice@/i,
    /^orders?@/i,
    /^payments?@/i,
    /^confirmations?@/i,
  ],
}

/**
 * Domains that are typically automated/marketing
 */
const AUTOMATED_DOMAINS = [
  "github.com",
  "vercel.com",
  "netlify.com",
  "heroku.com",
  "sendgrid.net",
  "mailchimp.com",
  "amazonses.com",
  "postmarkapp.com",
  "mailgun.org",
  "customeriomail.com",
]

/**
 * Personal email domains (likely real people)
 */
const PERSONAL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "me.com",
  "aol.com",
  "protonmail.com",
]

/**
 * Company name indicators in display names
 */
const COMPANY_NAME_PATTERNS = [
  /\b(LLC|Inc|Corp|Ltd|GmbH|Limited|Corporation|Company)\b/i,
  /\b(Team|Support|Help|Info|Service|Services|Notifications?)\b/i,
  /\b(Official|Verified|Account)\b/i,
]

/**
 * Common first/last names to help identify people
 * (simplified - in production you'd want a much larger list)
 */
const COMMON_NAME_PATTERNS = [
  /^[A-Z][a-z]+ [A-Z][a-z]+$/,  // "First Last" pattern
  /^[A-Z][a-z]+ [A-Z]\./,        // "First L." pattern
  /^[A-Z]\. [A-Z][a-z]+$/,       // "F. Last" pattern
]

/**
 * Keywords in subject/body that indicate marketing
 */
const MARKETING_KEYWORDS = [
  "unsubscribe",
  "view in browser",
  "click here",
  "limited time",
  "act now",
  "special offer",
  "discount",
  "% off",
  "free shipping",
]

/**
 * Keywords in subject/body that indicate personal communication
 */
const PERSONAL_KEYWORDS = [
  "thanks",
  "thank you",
  "question",
  "help",
  "please",
  "could you",
  "wondering",
  "quick question",
  "following up",
]

/**
 * Parse From field into display name and email address
 * Examples:
 *   "John Smith <john@gmail.com>" → { name: "John Smith", email: "john@gmail.com" }
 *   "john@gmail.com" → { name: "", email: "john@gmail.com" }
 *   "Venmo <venmo@venmo.com>" → { name: "Venmo", email: "venmo@venmo.com" }
 */
function parseFromField(from: string): { name: string; email: string } {
  // Match pattern: "Display Name <email@domain.com>" or just "email@domain.com"
  const match = from.match(/^(?:"?([^"<]+)"?\s*<)?([^>]+)>?$/)

  if (!match) {
    return { name: "", email: from.trim() }
  }

  const name = (match[1] || "").trim()
  const email = (match[2] || from).trim()

  return { name, email }
}

/**
 * Detect if a display name looks like a company/service name
 * Returns confidence score: 0 (definitely not company) to 1 (definitely company)
 */
function isCompanyName(displayName: string, domain: string): number {
  if (!displayName) return 0

  // Check for company indicators (Inc, LLC, Team, etc.)
  for (const pattern of COMPANY_NAME_PATTERNS) {
    if (pattern.test(displayName)) {
      return 0.95 // Very confident it's a company
    }
  }

  // Check if display name matches domain name (e.g., "Venmo" and "venmo.com")
  const domainPart = domain.split('.')[0].toLowerCase()
  const nameLower = displayName.toLowerCase()
  if (domainPart && nameLower === domainPart) {
    return 0.9 // Very likely company (name matches domain)
  }

  // Check if it's a single word (companies often use single-word names)
  const words = displayName.trim().split(/\s+/)
  if (words.length === 1) {
    // Single word - check if it's all caps (like "VENMO" or "UBER")
    if (displayName === displayName.toUpperCase() && displayName.length > 1) {
      return 0.85 // All caps single word = likely company
    }
    // Single capitalized word could be company or last name
    return 0.6 // Medium confidence it's a company
  }

  // Multiple words - check if it looks like a person name
  for (const pattern of COMMON_NAME_PATTERNS) {
    if (pattern.test(displayName)) {
      return 0.1 // Low confidence it's a company (looks like person name)
    }
  }

  // Check if all words are capitalized (could be person name or company name)
  const allCapitalized = words.every(w => /^[A-Z]/.test(w))
  if (allCapitalized && words.length >= 2 && words.length <= 4) {
    return 0.3 // Might be person name, low confidence company
  }

  return 0.5 // Unknown, neutral
}

/**
 * Detect if an email address username looks personal or automated
 * Examples:
 *   "john.smith" → personal
 *   "noreply", "info", "support" → automated
 */
function isPersonalUsername(email: string): boolean {
  const username = email.split('@')[0].toLowerCase()

  // Automated patterns
  const automatedPatterns = [
    'noreply', 'no-reply', 'donotreply',
    'info', 'hello', 'hi', 'contact',
    'support', 'help', 'team',
    'notification', 'notify', 'alert',
    'news', 'newsletter', 'updates',
    'marketing', 'promo', 'sales',
  ]

  if (automatedPatterns.some(p => username.includes(p))) {
    return false
  }

  // Personal indicators: has dots/underscores (john.smith, j_smith)
  // or numbers (john123) but not just numbers
  const hasPersonalPattern = /[._]/.test(username) || (/\d/.test(username) && /[a-z]/.test(username))

  return hasPersonalPattern
}

/**
 * Main filter function
 */
export function filterMessage(
  from: string,
  subject?: string,
  body?: string
): FilterResult {
  const { name: displayName, email } = parseFromField(from)
  const emailLower = email.toLowerCase()
  const subjectLower = (subject || "").toLowerCase()
  const bodyLower = (body || "").toLowerCase()
  const combined = `${subjectLower} ${bodyLower}`

  // Extract domain
  const domainMatch = emailLower.match(/@([^>]+)>?$/)
  const domain = domainMatch ? domainMatch[1].trim() : ""

  // 1. Check for no-reply patterns (100% confidence skip)
  for (const pattern of SKIP_PATTERNS.noReply) {
    if (pattern.test(emailLower)) {
      return {
        type: "automated",
        shouldAnalyze: false,
        reason: "No-reply address",
        confidence: 1.0,
      }
    }
  }

  // 2. Check for bot accounts (100% confidence skip)
  for (const pattern of SKIP_PATTERNS.bots) {
    if (pattern.test(from)) {
      return {
        type: "automated",
        shouldAnalyze: false,
        reason: "Bot account",
        confidence: 1.0,
      }
    }
  }

  // 3. Check display name for company indicators (NEW!)
  // This catches cases like "Venmo <venmo@venmo.com>" or "Uber <uber@uber.com>"
  if (displayName) {
    const companyScore = isCompanyName(displayName, domain)

    // High confidence it's a company name
    if (companyScore >= 0.85) {
      return {
        type: "automated",
        shouldAnalyze: false,
        reason: `Company/service name detected (${displayName})`,
        confidence: companyScore,
      }
    }

    // Medium-high confidence - check username for additional signals
    if (companyScore >= 0.6) {
      const hasPersonalUsername = isPersonalUsername(email)

      // Company name + non-personal username = likely automated
      if (!hasPersonalUsername) {
        return {
          type: "automated",
          shouldAnalyze: false,
          reason: `Company name with generic email (${displayName})`,
          confidence: 0.8,
        }
      }
    }
  }

  // 4. Check for automated domains (95% confidence skip)
  if (AUTOMATED_DOMAINS.some((d) => domain.includes(d))) {
    return {
      type: "automated",
      shouldAnalyze: false,
      reason: `Automated service (${domain})`,
      confidence: 0.95,
    }
  }

  // 5. Check for marketing addresses (90% confidence skip)
  for (const pattern of SKIP_PATTERNS.marketing) {
    if (pattern.test(emailLower)) {
      return {
        type: "marketing",
        shouldAnalyze: false,
        reason: "Marketing/team address",
        confidence: 0.9,
      }
    }
  }

  // 6. Check for transactional addresses (85% confidence skip)
  for (const pattern of SKIP_PATTERNS.transactional) {
    if (pattern.test(emailLower)) {
      return {
        type: "transactional",
        shouldAnalyze: false,
        reason: "Transactional email",
        confidence: 0.85,
      }
    }
  }

  // 7. Check for marketing keywords in content (70% confidence skip)
  const marketingMatches = MARKETING_KEYWORDS.filter((kw) =>
    combined.includes(kw)
  )
  if (marketingMatches.length >= 3) {
    return {
      type: "marketing",
      shouldAnalyze: false,
      reason: `Marketing content (${marketingMatches.length} indicators)`,
      confidence: 0.7,
    }
  }

  // 8. Check for personal domain + person name (IMPROVED!)
  const isPersonalDomain = PERSONAL_DOMAINS.some((d) => domain === d || domain.endsWith("." + d))
  const isEduDomain = domain.endsWith(".edu")

  if (isPersonalDomain || isEduDomain) {
    // Personal domain - but check if display name suggests company
    if (displayName) {
      const companyScore = isCompanyName(displayName, domain)

      // Even on personal domain, if name is clearly a company, skip it
      // (e.g., "Newsletter Service <news@gmail.com>")
      if (companyScore >= 0.85) {
        return {
          type: "automated",
          shouldAnalyze: false,
          reason: `Company using personal domain (${displayName})`,
          confidence: 0.8,
        }
      }
    }

    // Likely personal - domain + reasonable name/username
    return {
      type: "personal",
      shouldAnalyze: true,
      reason: isEduDomain ? `University email (${domain})` : `Personal email domain (${domain})`,
      confidence: 0.85,
    }
  }

  // 9. Check for personal keywords (75% confidence analyze)
  const personalMatches = PERSONAL_KEYWORDS.filter((kw) =>
    combined.includes(kw)
  )
  if (personalMatches.length >= 2) {
    return {
      type: "personal",
      shouldAnalyze: true,
      reason: `Personal communication patterns (${personalMatches.length} indicators)`,
      confidence: 0.75,
    }
  }

  // 10. Check if it's a reply (70% confidence analyze)
  if (subjectLower.startsWith("re:") || subjectLower.startsWith("fwd:")) {
    return {
      type: "personal",
      shouldAnalyze: true,
      reason: "Reply or forward",
      confidence: 0.7,
    }
  }

  // 11. Check display name for person-like patterns on corporate domains
  // This handles cases like "John Smith <john.smith@company.com>"
  if (displayName) {
    for (const pattern of COMMON_NAME_PATTERNS) {
      if (pattern.test(displayName)) {
        // Looks like a person name on corporate domain
        // Check username for additional confirmation
        if (isPersonalUsername(email)) {
          return {
            type: "personal",
            shouldAnalyze: true,
            reason: `Person at company (${displayName})`,
            confidence: 0.7,
          }
        }
      }
    }
  }

  // 12. Default: Unknown sender, medium priority
  // For legislative use: assume unknown = constituent, analyze
  // For personal use: you might want to skip unknown
  const isUnknownDomain = !domain.includes(".")
  if (isUnknownDomain) {
    return {
      type: "personal",
      shouldAnalyze: true,
      reason: "Unknown sender (assume personal)",
      confidence: 0.5,
    }
  }

  // Corporate domain but no other signals - likely automated/service
  return {
    type: "notification",
    shouldAnalyze: false,
    reason: "Corporate/service notification",
    confidence: 0.65,
  }
}

/**
 * Batch filter messages
 */
export function filterMessages(
  messages: Array<{ from: string; subject?: string; body?: string }>
): {
  shouldAnalyze: Array<{ from: string; subject?: string; body?: string }>
  shouldSkip: Array<{
    message: { from: string; subject?: string; body?: string }
    reason: string
  }>
  stats: {
    total: number
    analyze: number
    skip: number
    savings: string
  }
} {
  const shouldAnalyze: typeof messages = []
  const shouldSkip: Array<{
    message: (typeof messages)[0]
    reason: string
  }> = []

  for (const msg of messages) {
    const result = filterMessage(msg.from, msg.subject, msg.body)
    if (result.shouldAnalyze) {
      shouldAnalyze.push(msg)
    } else {
      shouldSkip.push({ message: msg, reason: result.reason })
    }
  }

  const savingsPercent = ((shouldSkip.length / messages.length) * 100).toFixed(
    1
  )

  return {
    shouldAnalyze,
    shouldSkip,
    stats: {
      total: messages.length,
      analyze: shouldAnalyze.length,
      skip: shouldSkip.length,
      savings: `${savingsPercent}% (${shouldSkip.length}/${messages.length})`,
    },
  }
}

/**
 * Test the filter on a specific email
 */
export function testFilter(from: string, subject?: string, body?: string): void {
  const result = filterMessage(from, subject, body)

  console.log("\n🔍 Filter Test Result:")
  console.log("━".repeat(50))
  console.log(`From: ${from}`)
  if (subject) console.log(`Subject: ${subject}`)
  console.log("")
  console.log(`Type: ${result.type}`)
  console.log(`Should Analyze: ${result.shouldAnalyze ? "✅ YES" : "❌ NO"}`)
  console.log(`Reason: ${result.reason}`)
  console.log(`Confidence: ${(result.confidence * 100).toFixed(0)}%`)
  console.log("━".repeat(50))
}

/**
 * Convert rule-based filter result to folder IDs
 * This is used when AI classification is not available
 */
export function classifyToFolders(
  from: string,
  subject?: string,
  body?: string,
  isOutbound?: boolean
): string[] {
  const result = filterMessage(from, subject, body)
  const folders: string[] = ['inbox'] // Every thread starts with inbox

  // Check if this is a sent message
  if (isOutbound) {
    folders.push('sent')
    return folders // Sent messages don't need other classifications
  }

  // Classify based on message type
  switch (result.type) {
    case 'personal':
      folders.push('from-people')
      break
    case 'automated':
    case 'notification':
      folders.push('automated')
      break
    case 'marketing':
      folders.push('newsletters')
      break
    case 'transactional':
      // Transactional emails don't get a specific folder, just inbox
      break
  }

  return folders
}

/**
 * Convert AI sender type to folder IDs
 * This is used when AI classification is available
 */
export function senderTypeToFolders(senderType: 'person' | 'automated' | 'uncertain'): string[] {
  const folders: string[] = ['inbox']

  switch (senderType) {
    case 'person':
      folders.push('from-people')
      break
    case 'automated':
      folders.push('automated')
      break
    case 'uncertain':
      // For uncertain, we'll need to fall back to rule-based
      // This function assumes AI has made a decision
      break
  }

  return folders
}
