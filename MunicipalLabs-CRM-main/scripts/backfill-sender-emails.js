/**
 * Backfill sender_email for threads with NULL values
 * Extracts from the first message in each thread
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load env
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

async function backfillSenderEmails() {
  const client = await pool.connect();

  try {
    console.log('\n🔧 Backfilling sender_email for threads with NULL values...\n');

    // Find threads with NULL sender_email
    const threadsResult = await client.query(`
      SELECT id, subject, gmail_thread_id
      FROM threads
      WHERE sender_email IS NULL
      ORDER BY last_message_ts DESC
    `);

    console.log(`Found ${threadsResult.rows.length} threads with NULL sender_email\n`);

    if (threadsResult.rows.length === 0) {
      console.log('✅ All threads already have sender_email!');
      return;
    }

    let updated = 0;
    let noMessages = 0;

    for (const thread of threadsResult.rows) {
      // Get first message from this thread
      const messageResult = await client.query(`
        SELECT from_email
        FROM messages
        WHERE thread_id = $1
        ORDER BY internal_date ASC
        LIMIT 1
      `, [thread.id]);

      if (messageResult.rows.length === 0) {
        noMessages++;
        console.log(`  ⚠️  No messages found for thread: ${thread.subject?.substring(0, 50)}`);
        continue;
      }

      const senderEmail = messageResult.rows[0].from_email;

      if (!senderEmail) {
        console.log(`  ⚠️  Message has no from_email: ${thread.subject?.substring(0, 50)}`);
        continue;
      }

      // Update thread with sender_email
      await client.query(`
        UPDATE threads
        SET sender_email = $1, updated_at = NOW()
        WHERE id = $2
      `, [senderEmail, thread.id]);

      updated++;
      console.log(`  ✓ ${senderEmail.substring(0, 50)} → ${thread.subject?.substring(0, 40)}`);
    }

    console.log('\n' + '═'.repeat(70));
    console.log(`✅ Backfill complete!`);
    console.log(`   Updated: ${updated} threads`);
    console.log(`   Skipped (no messages): ${noMessages}`);
    console.log('═'.repeat(70));
    console.log('\n💡 Restart your Next.js dev server and refresh /threads\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

backfillSenderEmails();
