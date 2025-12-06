/**
 * Check if constituent_profiles table exists
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

async function checkMigration() {
  const connectionString = process.env.DATABASE_URL;

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔍 Checking database schema...\n');

    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'constituent_profiles'
      );
    `);

    const tableExists = tableCheck.rows[0].exists;

    if (tableExists) {
      console.log('✅ constituent_profiles table EXISTS');

      // Check columns
      const columnsResult = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'constituent_profiles'
        ORDER BY ordinal_position;
      `);

      console.log(`📋 Table has ${columnsResult.rows.length} columns:`);
      columnsResult.rows.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type})`);
      });

      // Check indexes
      const indexesResult = await pool.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename = 'constituent_profiles';
      `);

      console.log(`\n🔑 Table has ${indexesResult.rows.length} indexes:`);
      indexesResult.rows.forEach(idx => {
        console.log(`   - ${idx.indexname}`);
      });

      // Count existing profiles
      const countResult = await pool.query(`
        SELECT COUNT(*) as count FROM constituent_profiles;
      `);

      console.log(`\n📊 Current profiles: ${countResult.rows[0].count}`);

      console.log('\n🎉 Migration already complete!');
      console.log('\nNext step: Run profile builder');
      console.log('   pnpm tsx scripts/build-constituent-profiles.ts');

    } else {
      console.log('❌ constituent_profiles table DOES NOT EXIST');
      console.log('\nThe migration needs to be run.');
    }

  } catch (error) {
    console.error('❌ Check failed:', error.message);
  } finally {
    await pool.end();
  }
}

checkMigration();
