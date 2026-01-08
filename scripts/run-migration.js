/**
 * Quick migration runner
 * Reads and executes a specified migration
 *
 * Usage: node scripts/run-migration.js <migration-name>
 * Example: node scripts/run-migration.js switch-to-folders-array
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
  // Get migration name from command line args
  const migrationName = process.argv[2];

  if (!migrationName) {
    console.error('❌ Error: Migration name required');
    console.error('');
    console.error('Usage: node scripts/run-migration.js <migration-name>');
    console.error('');
    console.error('Available migrations:');
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
    files.forEach(file => {
      console.error(`  - ${file.replace('.sql', '')}`);
    });
    process.exit(1);
  }

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
    const filename = migrationName.endsWith('.sql') ? migrationName : `${migrationName}.sql`;
    const sqlPath = path.join(__dirname, 'migrations', filename);

    if (!fs.existsSync(sqlPath)) {
      console.error(`❌ Migration file not found: ${filename}`);
      console.error('');
      console.error('Available migrations:');
      const migrationsDir = path.join(__dirname, 'migrations');
      const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
      files.forEach(file => {
        console.error(`  - ${file.replace('.sql', '')}`);
      });
      process.exit(1);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log(`📄 Running migration: ${filename}`);
    console.log('');

    // Execute the migration
    await pool.query(sql);

    console.log('✅ Migration completed successfully!');

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
