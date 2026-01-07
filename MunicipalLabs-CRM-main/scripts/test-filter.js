/**
 * Test the message filter on actual database emails
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

// Import filter (simple inline version for JS)
function filterMessage(from, subject = '', body = '') {
  const email = from.toLowerCase();
  const combined = `${subject} ${body}`.toLowerCase();

  // Extract domain
  const domainMatch = email.match(/@([^>]+)>?$/);
  const domain = domainMatch ? domainMatch[1].trim() : '';

  // 1. No-reply patterns (SKIP)
  if (/no-?reply@|notifications@|alerts@|automated@|system@/i.test(email)) {
    return { shouldAnalyze: false, reason: 'No-reply address', type: 'automated' };
  }

  // 2. Bot accounts (SKIP)
  if (/\[bot\]|github-actions|dependabot/i.test(from)) {
    return { shouldAnalyze: false, reason: 'Bot account', type: 'automated' };
  }

  // 3. Automated domains (SKIP)
  const automatedDomains = ['github.com', 'vercel.com', 'netlify.com', 'sendgrid', 'mailchimp'];
  if (automatedDomains.some(d => domain.includes(d))) {
    return { shouldAnalyze: false, reason: `Automated service (${domain})`, type: 'automated' };
  }

  // 4. Marketing addresses (SKIP)
  if (/^marketing@|^newsletter@|^updates@|^team@|^hello@|^support@/i.test(email)) {
    return { shouldAnalyze: false, reason: 'Marketing/team', type: 'marketing' };
  }

  // 5. Transactional (SKIP)
  if (/^receipts?@|^billing@|^invoice@|^orders?@/i.test(email)) {
    return { shouldAnalyze: false, reason: 'Transactional', type: 'transactional' };
  }

  // 6. Marketing keywords (SKIP if 3+)
  const marketingWords = ['unsubscribe', 'view in browser', 'limited time', 'discount', 'special offer'];
  const marketingCount = marketingWords.filter(w => combined.includes(w)).length;
  if (marketingCount >= 3) {
    return { shouldAnalyze: false, reason: `Marketing content (${marketingCount} indicators)`, type: 'marketing' };
  }

  // 7. Personal domains (ANALYZE)
  const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'];
  if (personalDomains.some(d => domain === d || domain.endsWith('.' + d))) {
    return { shouldAnalyze: true, reason: `Personal domain (${domain})`, type: 'personal' };
  }

  // 8. Personal keywords (ANALYZE if 2+)
  const personalWords = ['thanks', 'question', 'help', 'please', 'wondering'];
  const personalCount = personalWords.filter(w => combined.includes(w)).length;
  if (personalCount >= 2) {
    return { shouldAnalyze: true, reason: `Personal communication (${personalCount} indicators)`, type: 'personal' };
  }

  // 9. Reply/forward (ANALYZE)
  if (/^re:|^fwd:/i.test(subject)) {
    return { shouldAnalyze: true, reason: 'Reply or forward', type: 'personal' };
  }

  // Default: Skip corporate notifications
  return { shouldAnalyze: false, reason: 'Corporate/service notification', type: 'notification' };
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    console.log('🔍 Testing Message Filter on Your Actual Emails...\n');

    // Get unanalyzed messages
    const result = await pool.query(`
      SELECT
        m.from_email,
        t.subject,
        m.snippet
      FROM messages m
      JOIN threads t ON t.id = m.thread_id
      WHERE m.sentiment_score IS NULL
      LIMIT 300
    `);

    console.log(`📊 Analyzing ${result.rows.length} unanalyzed messages...\n`);

    const stats = {
      total: result.rows.length,
      shouldAnalyze: 0,
      shouldSkip: 0,
      byType: {
        personal: 0,
        automated: 0,
        marketing: 0,
        transactional: 0,
        notification: 0
      },
      skipExamples: []
    };

    for (const row of result.rows) {
      const filterResult = filterMessage(row.from_email, row.subject, row.snippet);

      if (filterResult.shouldAnalyze) {
        stats.shouldAnalyze++;
      } else {
        stats.shouldSkip++;
        if (stats.skipExamples.length < 10) {
          stats.skipExamples.push({
            from: row.from_email,
            reason: filterResult.reason
          });
        }
      }

      stats.byType[filterResult.type]++;
    }

    console.log('━'.repeat(70));
    console.log('                         FILTER RESULTS');
    console.log('━'.repeat(70));
    console.log('');
    console.log(`📧 Total Messages:          ${stats.total}`);
    console.log(`✅ Should Analyze:          ${stats.shouldAnalyze} (${((stats.shouldAnalyze/stats.total)*100).toFixed(1)}%)`);
    console.log(`❌ Should Skip:             ${stats.shouldSkip} (${((stats.shouldSkip/stats.total)*100).toFixed(1)}%)`);
    console.log('');
    console.log('📊 Breakdown by Type:');
    console.log(`   👤 Personal:             ${stats.byType.personal}`);
    console.log(`   🤖 Automated:            ${stats.byType.automated}`);
    console.log(`   📣 Marketing:            ${stats.byType.marketing}`);
    console.log(`   🧾 Transactional:        ${stats.byType.transactional}`);
    console.log(`   🔔 Notification:         ${stats.byType.notification}`);
    console.log('');
    console.log('💰 Cost Savings:');
    const costPerAnalysis = 0.0002; // ~$0.0002 per analysis with GPT-4o-mini
    const totalCost = stats.total * costPerAnalysis;
    const actualCost = stats.shouldAnalyze * costPerAnalysis;
    const savings = totalCost - actualCost;
    console.log(`   Without filter:          $${totalCost.toFixed(4)}`);
    console.log(`   With filter:             $${actualCost.toFixed(4)}`);
    console.log(`   💸 You save:             $${savings.toFixed(4)} (${((stats.shouldSkip/stats.total)*100).toFixed(0)}%)`);
    console.log('');
    console.log('❌ Sample Skipped Emails (first 10):');
    stats.skipExamples.forEach((ex, i) => {
      console.log(`   ${i+1}. ${ex.from.substring(0, 50)}`);
      console.log(`      → ${ex.reason}`);
    });
    console.log('');
    console.log('━'.repeat(70));
    console.log('');
    console.log('✨ Filter is ready! To use it:');
    console.log('   pnpm run analyze:messages (will automatically use filter)');
    console.log('');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

main();
