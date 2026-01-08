const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

(async () => {
  try {
    // Check John Doe's user records
    const users = await pool.query(`SELECT id, tenant_id, email, display_name FROM users WHERE email = 'johndoe@municipallabs.ai'`);

    console.log('\n=== John Doe user records ===');
    users.rows.forEach(u => {
      console.log(`User ID: ${u.id}`);
      console.log(`Tenant ID: ${u.tenant_id}`);
      console.log(`Email: ${u.email}`);
      console.log(`Display Name: ${u.display_name}`);
      console.log('');
    });

    // Get tenant names
    const tenants = await pool.query(`SELECT id, name FROM tenants WHERE id IN ('0b10bc6b-8fee-4ad1-b8af-3750a836acf8', '08316542-314b-4964-875f-936f834599b9')`);
    console.log('=== Tenants ===');
    tenants.rows.forEach(t => console.log(`${t.id.substring(0, 8)}... => ${t.name}`));

    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
