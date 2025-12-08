const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
});

(async () => {
  try {
    // Check which tenant has messages
    const result = await pool.query(`
      SELECT
        tenant_id,
        COUNT(*) as message_count,
        MAX(internal_date) as latest_message
      FROM messages
      GROUP BY tenant_id
      ORDER BY message_count DESC
    `);

    console.log('\n=== Messages by tenant ===');
    result.rows.forEach(row => {
      console.log(`Tenant: ${row.tenant_id}`);
      console.log(`  Messages: ${row.message_count}`);
      console.log(`  Latest: ${row.latest_message}`);
      console.log('');
    });

    // Check both johndoe tenants specifically
    console.log('=== Checking both John Doe tenants ===');
    const john1 = await pool.query('SELECT COUNT(*) FROM messages WHERE tenant_id = $1', ['08316542-314b-4964-875f-936f8fc10e36']);
    const john2 = await pool.query('SELECT COUNT(*) FROM messages WHERE tenant_id = $1', ['0b10bc6b-8fee-4ad1-b8af-3750a836acf8']);

    console.log(`Tenant 08316542-314b...: ${john1.rows[0].count} messages`);
    console.log(`Tenant 0b10bc6b-8fee...: ${john2.rows[0].count} messages`);

    // Check tenant names
    console.log('\n=== Tenant names ===');
    const tenants = await pool.query('SELECT id, name FROM tenants ORDER BY created_at DESC LIMIT 10');
    tenants.rows.forEach(t => {
      console.log(`${t.id} => ${t.name}`);
    });

    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
