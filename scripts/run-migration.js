/**
 * Quick migration runner
 * Reads and executes the constituent profiles migration
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

async function runMigration() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ DATABASE_URL not found in environment');
    process.exit(1);
  }

  console.log('🔗 Connecting to database...');

  const pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // Read the migration SQL file
    const sqlPath = path.join(__dirname, 'migrations', 'add-constituent-profiles.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 Running migration: add-constituent-profiles.sql');

    // Execute the migration
    await pool.query(sql);

    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('🎉 constituent_profiles table has been created');
    console.log('📊 Indexes have been created for fast lookups');
    console.log('');
    console.log('Next steps:');
    console.log('1. Run: pnpm tsx scripts/build-constituent-profiles.ts');
    console.log('2. Start dev server: pnpm dev');
    console.log('3. Go to /threads and hover on emails!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('');
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
