const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

(async () => {
  try {
    const newTenantId = '08316542-314b-4964-875f-936f834599b9';

    const res = await pool.query(
      `SELECT id, user_id, tenant_id, email,
              encrypted_refresh_token IS NOT NULL as has_refresh_token,
              created_at
       FROM gmail_accounts
       WHERE tenant_id = $1`,
      [newTenantId]
    );

    console.log('\n=== Gmail accounts in johndoe@municipallabs.ai tenant ===');
    if (res.rows.length === 0) {
      console.log('❌ NO Gmail accounts found!');
      console.log('This is why sync failed - there is no Gmail account connected to this tenant.');
    } else {
      res.rows.forEach(account => {
        console.log(`Email: ${account.email}`);
        console.log(`User ID: ${account.user_id}`);
        console.log(`Has refresh token: ${account.has_refresh_token}`);
        console.log(`Created: ${account.created_at}`);
        console.log('');
      });
    }

    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
