/**
 * Check a sample profile
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
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

async function main() {
  try {
    // Get a sample profile
    const result = await pool.query(`
      SELECT
        email,
        name,
        total_emails,
        total_casework,
        total_correspondence,
        first_contact,
        last_contact,
        avg_sentiment,
        top_topics
      FROM constituent_profiles
      ORDER BY total_emails DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      console.log('No profiles found');
      return;
    }

    const profile = result.rows[0];

    console.log('\n📋 Sample Profile:');
    console.log('━'.repeat(50));
    console.log(`📧 Email: ${profile.email}`);
    console.log(`👤 Name: ${profile.name || 'Unknown'}`);
    console.log(`📊 Total Emails: ${profile.total_emails}`);
    console.log(`   - Casework: ${profile.total_casework}`);
    console.log(`   - Correspondence: ${profile.total_correspondence}`);
    console.log(`📅 First Contact: ${profile.first_contact?.toLocaleString() || 'N/A'}`);
    console.log(`📅 Last Contact: ${profile.last_contact?.toLocaleString() || 'N/A'}`);

    if (profile.avg_sentiment !== null) {
      const sentimentPct = ((profile.avg_sentiment + 1) * 50).toFixed(0);
      const emoji = profile.avg_sentiment > 0.3 ? '😊' : profile.avg_sentiment < -0.3 ? '😟' : '😐';
      console.log(`${emoji} Sentiment: ${sentimentPct}% positive (score: ${profile.avg_sentiment.toFixed(2)})`);
    }

    if (profile.top_topics) {
      console.log(`\n💬 Top Topics:`);
      profile.top_topics.forEach(topic => {
        console.log(`   - ${topic.topic}: ${topic.count} emails`);
      });
    }

    console.log('━'.repeat(50));
    console.log('\n✅ Profiles are ready to use!');
    console.log('\n🚀 Next: Start your dev server and hover on emails at /threads');

  } finally {
    await pool.end();
  }
}

main();
