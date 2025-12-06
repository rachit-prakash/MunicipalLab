/**
 * Smart Message Filter
 *
 * Pre-filters emails before AI analysis to save API costs.
 * Only analyzes emails from real people that matter.
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
 * Main filter function
 */
export function filterMessage(
  from: string,
  subject?: string,
  body?: string
): FilterResult {
  const email = from.toLowerCase()
  const subjectLower = (subject || "").toLowerCase()
  const bodyLower = (body || "").toLowerCase()
  const combined = `${subjectLower} ${bodyLower}`

  // Extract domain
  const domainMatch = email.match(/@([^>]+)>?$/)
  const domain = domainMatch ? domainMatch[1].trim() : ""

  // 1. Check for no-reply patterns (100% confidence skip)
  for (const pattern of SKIP_PATTERNS.noReply) {
    if (pattern.test(email)) {
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

  // 3. Check for automated domains (95% confidence skip)
  if (AUTOMATED_DOMAINS.some((d) => domain.includes(d))) {
    return {
      type: "automated",
      shouldAnalyze: false,
      reason: `Automated service (${domain})`,
      confidence: 0.95,
    }
  }

  // 4. Check for marketing addresses (90% confidence skip)
  for (const pattern of SKIP_PATTERNS.marketing) {
    if (pattern.test(email)) {
      return {
        type: "marketing",
        shouldAnalyze: false,
        reason: "Marketing/team address",
        confidence: 0.9,
      }
    }
  }

  // 5. Check for transactional addresses (85% confidence skip)
  for (const pattern of SKIP_PATTERNS.transactional) {
    if (pattern.test(email)) {
      return {
        type: "transactional",
        shouldAnalyze: false,
        reason: "Transactional email",
        confidence: 0.85,
      }
    }
  }

  // 6. Check for marketing keywords in content (70% confidence skip)
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

  // 7. Check for personal domain (80% confidence analyze)
  if (PERSONAL_DOMAINS.some((d) => domain === d || domain.endsWith("." + d))) {
    return {
      type: "personal",
      shouldAnalyze: true,
      reason: `Personal email domain (${domain})`,
      confidence: 0.8,
    }
  }

  // 8. Check for personal keywords (75% confidence analyze)
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

  // 9. Check if it's a reply (70% confidence analyze)
  if (subjectLower.startsWith("re:") || subjectLower.startsWith("fwd:")) {
    return {
      type: "personal",
      shouldAnalyze: true,
      reason: "Reply or forward",
      confidence: 0.7,
    }
  }

  // 10. Default: Unknown sender, medium priority
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

  // Corporate domain but no other signals
  return {
    type: "notification",
    shouldAnalyze: false,
    reason: "Corporate/service notification",
    confidence: 0.6,
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
