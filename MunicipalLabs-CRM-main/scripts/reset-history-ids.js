const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

(async () => {
  try {
    console.log('🔄 Resetting history_ids for all gmail_accounts...');
    console.log('This will force a full sync on next sync attempt.');

    const result = await pool.query(
      `UPDATE gmail_accounts
       SET history_id = NULL
       WHERE history_id IS NOT NULL
       RETURNING email, tenant_id`
    );

    console.log(`\n✅ Reset history_id for ${result.rows.length} accounts:`);
    result.rows.forEach(row => {
      console.log(`  - ${row.email}`);
    });

    console.log('\n⚠️  Now click "Sync Now" in the app to pull all emails!');

    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
