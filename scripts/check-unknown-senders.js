const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

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

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkUnknownSenders() {
  try {
    const result = await pool.query(`
      SELECT
        id,
        subject,
        sender_email,
        snippet,
        last_message_ts
      FROM threads
      WHERE sender_email IS NULL
      ORDER BY last_message_ts DESC
      LIMIT 10
    `);

    console.log(`\n🔍 Found ${result.rows.length} threads with NULL sender_email:\n`);

    if (result.rows.length === 0) {
      console.log('✅ No threads with NULL sender_email found!');
      console.log('The issue must be elsewhere...\n');

      // Check if issue is in the display logic
      console.log('Checking threads table structure...');
      const schemaResult = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'threads' AND column_name = 'sender_email'
      `);
      console.log('sender_email column:', schemaResult.rows[0]);
    } else {
      result.rows.forEach((row, i) => {
        console.log(`${i + 1}. Subject: ${(row.subject || 'NULL').substring(0, 60)}`);
        console.log(`   Snippet: ${(row.snippet || 'NULL').substring(0, 80)}`);
        console.log(`   Date: ${row.last_message_ts}`);
        console.log('');
      });

      console.log('\n💡 These threads need to be synced properly from Gmail.');
      console.log('   Check your Gmail sync process.\n');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkUnknownSenders();
