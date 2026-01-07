/**
 * Run multi-account support migration
 *
 * This script migrates the database to support multiple Gmail accounts per user
 */

import { query } from "@/lib/db"
import { readFileSync } from "fs"
import { join } from "path"

async function runMigration() {
  console.log('🔄 Starting multi-account migration...\n')

  try {
    // Read the migration SQL file
    const migrationPath = join(process.cwd(), 'scripts', 'migrations', 'add-multi-account-support.sql')
    const sql = readFileSync(migrationPath, 'utf-8')

    console.log('📄 Loaded migration SQL\n')

    // Execute the migration
    console.log('⚙️  Executing migration...')
    await query(sql)

    console.log('✅ Migration completed successfully!\n')
    console.log('📊 Summary of changes:')
    console.log('   - gmail_accounts now has `id` as primary key')
    console.log('   - Users can now connect multiple Gmail accounts')
    console.log('   - threads and messages now track which account they belong to')
    console.log('   - Added is_primary flag to mark primary accounts')
    console.log('   - Added display_name for custom account labels\n')

    // Show current accounts
    const accountsResult = await query(`
      SELECT
        ga.id,
        ga.email,
        ga.display_name,
        ga.is_primary,
        u.id as user_id,
        ga.last_sync_at
      FROM gmail_accounts ga
      JOIN users u ON u.id = ga.user_id
      ORDER BY u.id, ga.is_primary DESC, ga.created_at ASC
    `)

    if (accountsResult.rows.length > 0) {
      console.log('📧 Current Gmail accounts:')
      accountsResult.rows.forEach((account: any) => {
        const primaryTag = account.is_primary ? ' [PRIMARY]' : ''
        const lastSync = account.last_sync_at
          ? new Date(account.last_sync_at).toLocaleString()
          : 'Never'
        console.log(`   - ${account.email}${primaryTag}`)
        console.log(`     Last sync: ${lastSync}`)
      })
      console.log('')
    }

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

runMigration()
  .then(() => {
    console.log('✨ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
