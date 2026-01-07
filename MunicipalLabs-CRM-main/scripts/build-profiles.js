/**
 * Build Constituent Profiles - JS version with proper env loading
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

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function buildConstituentProfile(tenantId, email) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Basic stats
    const statsQuery = await client.query(`
      SELECT
        COUNT(DISTINCT t.id) as total_emails,
        SUM(CASE WHEN t.type = 'CASEWORK' THEN 1 ELSE 0 END) as total_casework,
        SUM(CASE WHEN t.type = 'CORRESPONDENCE' THEN 1 ELSE 0 END) as total_correspondence,
        MIN(t.last_message_ts) as first_contact,
        MAX(t.last_message_ts) as last_contact
      FROM threads t
      WHERE t.tenant_id = $1 AND t.sender_email = $2
    `, [tenantId, email]);

    const stats = statsQuery.rows[0];
    if (!stats || parseInt(stats.total_emails) === 0) {
      await client.query("COMMIT");
      return null;
    }

    // 2. Sentiment
    const sentimentQuery = await client.query(`
      SELECT
        AVG(m.sentiment_score) as avg_sentiment
      FROM messages m
      JOIN threads t ON t.id = m.thread_id
      WHERE t.tenant_id = $1 AND t.sender_email = $2 AND m.sentiment_score IS NOT NULL
    `, [tenantId, email]);

    const sentiment = sentimentQuery.rows[0];

    // 3. Top topics
    const topicsQuery = await client.query(`
      SELECT
        t.topic,
        COUNT(*) as count,
        MAX(t.last_message_ts) as last_mentioned
      FROM threads t
      WHERE t.tenant_id = $1 AND t.sender_email = $2 AND t.topic IS NOT NULL
      GROUP BY t.topic
      ORDER BY count DESC
      LIMIT 5
    `, [tenantId, email]);

    const topTopics = topicsQuery.rows.map(row => ({
      topic: row.topic,
      count: parseInt(row.count),
      lastMentioned: row.last_mentioned?.toISOString()
    }));

    // 4. Upsert profile
    await client.query(`
      INSERT INTO constituent_profiles (
        tenant_id, email,
        total_emails, total_casework, total_correspondence,
        first_contact, last_contact,
        avg_sentiment, sentiment_trend,
        top_topics,
        last_analyzed_at
      ) VALUES (
        $1, $2,
        $3, $4, $5,
        $6, $7,
        $8, 'stable',
        $9,
        NOW()
      )
      ON CONFLICT (tenant_id, email) DO UPDATE SET
        total_emails = EXCLUDED.total_emails,
        total_casework = EXCLUDED.total_casework,
        total_correspondence = EXCLUDED.total_correspondence,
        first_contact = EXCLUDED.first_contact,
        last_contact = EXCLUDED.last_contact,
        avg_sentiment = EXCLUDED.avg_sentiment,
        top_topics = EXCLUDED.top_topics,
        last_analyzed_at = EXCLUDED.last_analyzed_at,
        updated_at = NOW()
    `, [
      tenantId,
      email,
      parseInt(stats.total_emails),
      parseInt(stats.total_casework),
      parseInt(stats.total_correspondence),
      stats.first_contact,
      stats.last_contact,
      sentiment.avg_sentiment,
      JSON.stringify(topTopics)
    ]);

    await client.query("COMMIT");
    return { email, count: parseInt(stats.total_emails) };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    console.log('🚀 Starting constituent profile builder...');

    // Get all tenants
    const tenantResult = await pool.query(`
      SELECT id, name FROM tenants ORDER BY name
    `);

    if (tenantResult.rows.length === 0) {
      console.log('⚠️  No tenants found in database');
      return;
    }

    let totalCount = 0;

    for (const tenant of tenantResult.rows) {
      console.log(`\n📂 Processing tenant: ${tenant.name || 'Unknown'} (${tenant.id})`);

      // Get all unique senders for this tenant
      const sendersResult = await pool.query(`
        SELECT DISTINCT sender_email
        FROM threads
        WHERE tenant_id = $1 AND sender_email IS NOT NULL
        ORDER BY sender_email
      `, [tenant.id]);

      console.log(`   Found ${sendersResult.rows.length} unique senders`);

      let tenantCount = 0;
      for (const row of sendersResult.rows) {
        try {
          const result = await buildConstituentProfile(tenant.id, row.sender_email);
          if (result) {
            tenantCount++;
            process.stdout.write(`\r   Progress: ${tenantCount}/${sendersResult.rows.length} profiles built`);
          }
        } catch (error) {
          console.error(`\n   ❌ Failed for ${row.sender_email}:`, error.message);
        }
      }

      console.log(`\n   ✅ Built ${tenantCount} profiles`);
      totalCount += tenantCount;
    }

    console.log(`\n🎉 Total: Built ${totalCount} constituent profiles across ${tenantResult.rows.length} tenant(s)`);
    console.log('\nNext steps:');
    console.log('1. Start dev server: pnpm dev');
    console.log('2. Go to /threads');
    console.log('3. Hover over any sender email to see their profile! ✨');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
