#!/usr/bin/env tsx
/**
 * Run database migration for sender classification
 *
 * Usage: npx tsx scripts/run-migration.ts
 */

import { pool } from '../lib/db'
import { readFileSync } from 'fs'
import { join } from 'path'

async function runMigration() {
  console.log('🚀 Starting sender classification migration...')

  try {
    // Read the migration SQL file
    const migrationPath = join(__dirname, 'migrations', 'add-sender-classification.sql')
    const sql = readFileSync(migrationPath, 'utf-8')

    console.log('📄 Migration SQL loaded')
    console.log('=' .repeat(60))
    console.log(sql)
    console.log('=' .repeat(60))

    // Execute the migration
    console.log('\n⚙️  Executing migration...')
    await pool.query(sql)

    console.log('✅ Migration completed successfully!')
    console.log('\n📊 Verifying migration...')

    // Verify the column was added
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'threads' AND column_name = 'sender_type'
    `)

    if (result.rows.length > 0) {
      console.log('✅ Column verified:', result.rows[0])
    } else {
      console.log('❌ Column not found - migration may have failed')
    }

    // Check the index
    const indexResult = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'threads' AND indexname = 'idx_threads_sender_type'
    `)

    if (indexResult.rows.length > 0) {
      console.log('✅ Index verified:', indexResult.rows[0].indexname)
    } else {
      console.log('❌ Index not found')
    }

    console.log('\n🎉 All done! Sender classification is now enabled.')
    console.log('💡 New emails will be automatically classified by AI.')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

runMigration()
