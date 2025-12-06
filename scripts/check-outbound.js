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

async function check() {
  try {
    // Check threads table schema
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'threads'
      ORDER BY ordinal_position
    `);

    console.log('📋 Threads table columns:');
    result.rows.forEach(r => console.log(`  - ${r.column_name} (${r.data_type})`));

    // Check for user's email
    const userResult = await pool.query(`
      SELECT email FROM gmail_accounts LIMIT 1
    `);

    const userEmail = userResult.rows[0]?.email;
    console.log(`\n📧 Your email: ${userEmail}`);

    // Check threads from you
    const threadsResult = await pool.query(`
      SELECT subject, sender_email
      FROM threads
      WHERE sender_email ILIKE '%' || $1 || '%'
      LIMIT 5
    `, [userEmail]);

    console.log(`\n🔍 Threads FROM you (${threadsResult.rows.length}):`);
    threadsResult.rows.forEach(t => {
      console.log(`  - "${t.subject?.substring(0, 50)}" (from: ${t.sender_email})`);
    });

    console.log('\n💡 These are YOUR sent emails - they should be filtered out from the inbox!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

check();
