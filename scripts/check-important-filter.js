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

// Import filter logic
function filterMessage(from, subject = '', body = '') {
  const email = from.toLowerCase();
  const combined = `${subject} ${body}`.toLowerCase();
  const domainMatch = email.match(/@([^>]+)>?$/);
  const domain = domainMatch ? domainMatch[1].trim() : '';

  if (/no-?reply@|notifications@|alerts@|automated@|system@/i.test(email)) {
    return { shouldAnalyze: false, reason: 'No-reply address', type: 'automated' };
  }
  if (/\[bot\]|github-actions|dependabot/i.test(from)) {
    return { shouldAnalyze: false, reason: 'Bot account', type: 'automated' };
  }
  const automatedDomains = ['github.com', 'vercel.com', 'netlify.com', 'sendgrid', 'mailchimp'];
  if (automatedDomains.some(d => domain.includes(d))) {
    return { shouldAnalyze: false, reason: `Automated (${domain})`, type: 'automated' };
  }
  if (/^marketing@|^newsletter@|^updates@|^team@|^hello@|^support@/i.test(email)) {
    return { shouldAnalyze: false, reason: 'Marketing', type: 'marketing' };
  }
  const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'];
  if (personalDomains.some(d => domain === d || domain.endsWith('.' + d))) {
    return { shouldAnalyze: true, reason: `Personal (${domain})`, type: 'personal' };
  }
  if (/^re:|^fwd:/i.test(subject)) {
    return { shouldAnalyze: true, reason: 'Reply/forward', type: 'personal' };
  }
  return { shouldAnalyze: false, reason: 'Corporate notification', type: 'notification' };
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkImportantThreads() {
  try {
    // Get tenant
    const tenantResult = await pool.query('SELECT id FROM tenants LIMIT 1');
    const tenantId = tenantResult.rows[0].id;

    // Get all threads
    const threadsResult = await pool.query(`
      SELECT
        id,
        COALESCE(subject, '(No subject)') AS subject,
        COALESCE(sender_email, 'Unknown sender') AS sender,
        last_message_ts as "receivedAt",
        type,
        topic,
        stance,
        COALESCE(summary, '(No summary yet)') AS summary,
        confidence,
        unread
      FROM threads
      WHERE tenant_id = $1
      ORDER BY last_message_ts DESC
      LIMIT 100
    `, [tenantId]);

    console.log(`📊 Total threads in DB: ${threadsResult.rows.length}\n`);

    // Apply filter (same logic as API)
    const filteredThreads = threadsResult.rows.filter((thread) => {
      const filterResult = filterMessage(thread.sender, thread.subject);
      return filterResult.shouldAnalyze;
    });

    console.log(`✅ Important threads (after filter): ${filteredThreads.length}\n`);
    console.log('═'.repeat(70));

    if (filteredThreads.length === 0) {
      console.log('⚠️  No important threads found!');
      console.log('All your emails are automated/newsletters/bots.\n');
      console.log('This is why you might see "unknown senders" - the filter removes everything,');
      console.log('leaving only the fallback display or empty state.\n');
    } else {
      console.log('📧 Important threads that SHOULD appear in your inbox:\n');
      filteredThreads.slice(0, 10).forEach((thread, i) => {
        console.log(`${i + 1}. "${thread.subject.substring(0, 60)}"`);
        console.log(`   From: ${thread.sender}`);
        console.log(`   Topic: ${thread.topic || '❌ MISSING TOPIC'}`);
        console.log(`   Type: ${thread.type || '❌ MISSING TYPE'}`);
        console.log('');
      });
    }

    // Check for any threads with missing data
    const missingTopic = threadsResult.rows.filter(t => !t.topic);
    const missingSender = threadsResult.rows.filter(t => t.sender === 'Unknown sender');

    console.log('═'.repeat(70));
    console.log(`\n🔍 Data Quality Check:`);
    console.log(`   Threads missing topic: ${missingTopic.length}`);
    console.log(`   Threads with "Unknown sender": ${missingSender.length}`);

    if (missingTopic.length > 0) {
      console.log(`\n⚠️  ${missingTopic.length} threads are missing topics:`);
      missingTopic.slice(0, 5).forEach((thread, i) => {
        console.log(`   ${i + 1}. ${thread.subject.substring(0, 50)} (from ${thread.sender})`);
      });
      console.log('\n💡 Run: node scripts/analyze-with-filter.js to populate topics\n');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkImportantThreads();
