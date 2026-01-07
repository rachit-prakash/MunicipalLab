/**
 * Fix urgency levels for automated messages
 *
 * This script updates existing messages in the database to set their urgency_level
 * to 'low' if they are from automated/service accounts. This fixes the issue where
 * service notifications (Google security alerts, Vercel errors, etc.) were
 * incorrectly classified as urgent.
 */

import { query, withTenant } from "@/lib/db"

// Patterns that identify automated/service emails
const AUTOMATED_PATTERNS = [
  // No-reply addresses
  '%noreply%',
  '%no-reply%',
  '%donotreply%',
  '%do-not-reply%',

  // Service/team addresses
  '%notifications%',
  '%notify%',
  '%team%',
  '%support%',
  '%hello%',
  '%info%',
  '%help%',
  '%alert%',
  '%update%',
  '%news%',

  // Specific services
  '%@google.com%',
  '%@github.com%',
  '%@vercel.com%',
  '%@stripe.com%',
  '%@paypal.com%',
  '%@venmo.com%',
  '%@uber.com%',
  '%@lyft.com%',
  '%@amazon.com%',
  '%@netflix.com%',
  '%@spotify.com%',
  '%@linkedin.com%',
  '%@twitter.com%',
  '%@facebook.com%',
  '%@instagram.com%',
]

async function fixUrgentCases() {
  console.log('🔧 Starting urgency level fix for automated messages...\n')

  // Get all tenants
  const tenantResult = await query('SELECT id FROM tenants')
  const tenants = tenantResult.rows

  console.log(`Found ${tenants.length} tenant(s)\n`)

  for (const tenant of tenants) {
    const tenantId = tenant.id
    console.log(`Processing tenant: ${tenantId}`)

    await withTenant(tenantId, async (client) => {
      // Build WHERE clause with all patterns
      const whereConditions = AUTOMATED_PATTERNS.map((_, index) =>
        `LOWER(from_email) LIKE $${index + 2}`
      ).join(' OR ')

      // Update urgency level for automated messages that are currently high/critical
      const updateQuery = `
        UPDATE messages
        SET
          urgency_level = 'low',
          updated_at = NOW()
        WHERE tenant_id = $1
          AND urgency_level IN ('high', 'critical')
          AND (${whereConditions})
      `

      const result = await client.query(
        updateQuery,
        [tenantId, ...AUTOMATED_PATTERNS]
      )

      console.log(`  ✓ Updated ${result.rowCount} message(s) from urgent to low\n`)
    })
  }

  console.log('✅ Urgency level fix complete!\n')
  console.log('📊 Summary:')
  console.log('   - Automated service emails (Google, Vercel, etc.) set to low urgency')
  console.log('   - Marketing and transactional emails set to low urgency')
  console.log('   - Future syncs will use improved urgency classification\n')
}

// Run the script
fixUrgentCases()
  .then(() => {
    console.log('Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error fixing urgent cases:', error)
    process.exit(1)
  })
