const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

(async () => {
  try {
    const oldUserId = '0a31d13c-4554-49b3-b09e-8805c6ea997b'; // old user in default tenant

    // Delete the gmail_account for johndoe in the default tenant (duplicate)
    console.log('Deleting duplicate Gmail account from default tenant...');
    await pool.query(
      `DELETE FROM gmail_accounts
       WHERE email = 'johndoe@municipallabs.ai' AND tenant_id = '0b10bc6b-8fee-4ad1-b8af-3750a836acf8'`
    );

    // Delete the old user record (in default tenant)
    console.log('Deleting old user record from default tenant...');
    await pool.query(`DELETE FROM users WHERE id = $1`, [oldUserId]);

    console.log('✅ Done! Cleaned up duplicate records.');
    console.log('⚠️  You MUST SIGN OUT and SIGN BACK IN for changes to take effect.');
    console.log('⚠️  Then click SYNC NOW to pull your Gmail emails into your isolated tenant.');

    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
