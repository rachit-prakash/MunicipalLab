/**
 * Analyze messages with smart filtering
 * Only analyzes personal emails, skips bots/automated
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

// Import filter
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

// OpenAI API call
async function analyzeMessage(from, subject, body) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = 'gpt-4o-mini';

  const content = [subject, body].filter(Boolean).join('\n\n');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: 'You are a policy intelligence analyzer for constituent emails. Given subject/body text, return ONLY minified JSON with keys: { sentiment_score (-1..1), urgency_level (low|medium|high|critical), urgency_reasons (string array), topic (short title), confidence (0..1) }. Respond with JSON only. Use null for unknown values.'
        },
        {
          role: 'user',
          content
        }
      ]
    })
  });

  const data = await response.json();
  const text = data.choices[0].message.content.trim();

  try {
    const json = JSON.parse(text);
    return {
      sentimentScore: json.sentiment_score ?? null,
      urgencyLevel: json.urgency_level || 'low',
      urgencyReasons: json.urgency_reasons || [],
      topic: json.topic || 'Uncategorized',
      confidence: json.confidence ?? null
    };
  } catch (e) {
    return {
      sentimentScore: null,
      urgencyLevel: 'low',
      urgencyReasons: [],
      topic: 'Uncategorized',
      confidence: null
    };
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    console.log('\n🧠 Starting AI Analysis with Smart Filter...\n');

    // Get tenant
    const tenantResult = await pool.query('SELECT id, name FROM tenants LIMIT 1');
    if (!tenantResult.rows.length) {
      console.log('No tenants found');
      return;
    }

    const tenant = tenantResult.rows[0];
    console.log(`Processing tenant: ${tenant.name}\n`);

    // Get unanalyzed messages
    const messagesResult = await pool.query(`
      SELECT
        m.id,
        m.thread_id,
        m.from_email,
        t.subject,
        m.snippet,
        m.body_redacted
      FROM messages m
      JOIN threads t ON t.id = m.thread_id
      WHERE m.tenant_id = $1
        AND m.is_outbound = false
        AND m.sentiment_score IS NULL
      ORDER BY m.internal_date DESC
      LIMIT 300
    `, [tenant.id]);

    console.log(`Found ${messagesResult.rows.length} unanalyzed messages\n`);

    let analyzed = 0;
    let skipped = 0;
    const filterStats = {};

    for (const msg of messagesResult.rows) {
      // Apply filter
      const filterResult = filterMessage(
        msg.from_email,
        msg.subject,
        msg.snippet || msg.body_redacted
      );

      if (!filterResult.shouldAnalyze) {
        skipped++;
        filterStats[filterResult.type] = (filterStats[filterResult.type] || 0) + 1;
        console.log(`  ⊘ ${msg.from_email.substring(0, 40)} - ${filterResult.reason}`);
        continue;
      }

      // Analyze with AI
      try {
        const analysis = await analyzeMessage(
          msg.from_email,
          msg.subject,
          msg.snippet || msg.body_redacted
        );

        // Save to database
        await pool.query(`
          UPDATE messages
          SET
            sentiment_score = $1,
            urgency_level = $2,
            urgency_reasons = $3,
            analyzed_at = NOW()
          WHERE id = $4
        `, [
          analysis.sentimentScore,
          analysis.urgencyLevel,
          analysis.urgencyReasons,
          msg.id
        ]);

        // Update thread
        await pool.query(`
          UPDATE threads
          SET
            topic = $1,
            confidence = $2
          WHERE id = $3
        `, [
          analysis.topic,
          analysis.confidence,
          msg.thread_id
        ]);

        analyzed++;
        const sentPct = analysis.sentimentScore !== null
          ? Math.round((analysis.sentimentScore + 1) * 50)
          : 'N/A';
        console.log(`  ✓ ${msg.from_email.substring(0, 40)} · ${analysis.topic} · ${sentPct}%`);

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`  ✗ Failed: ${msg.from_email.substring(0, 40)} - ${error.message}`);
      }
    }

    // Summary
    console.log('\n' + '═'.repeat(70));
    console.log(`  ✅ Analyzed: ${analyzed} messages`);
    console.log(`  ⊘ Skipped by filter: ${skipped} messages`);
    console.log(`  📊 Filter breakdown:`);
    for (const [type, count] of Object.entries(filterStats)) {
      console.log(`     - ${type}: ${count}`);
    }
    const total = analyzed + skipped;
    const savingsPercent = total > 0 ? ((skipped / total) * 100).toFixed(1) : '0';
    console.log(`  💰 Cost savings: ${savingsPercent}% (${skipped}/${total} skipped)`);
    console.log('═'.repeat(70));

    console.log('\n✨ Done! Now rebuild profiles:');
    console.log('   node scripts/build-profiles.js\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

main();
