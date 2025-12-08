const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

(async () => {
  try {
    console.log('🗑️  RESETTING ALL DATA...');
    console.log('This will delete:');
    console.log('  - All messages');
    console.log('  - All threads');
    console.log('  - All gmail_accounts');
    console.log('  - All users');
    console.log('  - All tenants (except "demo")');
    console.log('');

    // Delete in correct order due to foreign keys
    console.log('Deleting messages...');
    const messages = await pool.query('DELETE FROM messages WHERE tenant_id != \'demo\' RETURNING id');
    console.log(`  Deleted ${messages.rowCount} messages`);

    console.log('Deleting threads...');
    const threads = await pool.query('DELETE FROM threads WHERE tenant_id != \'demo\' RETURNING id');
    console.log(`  Deleted ${threads.rowCount} threads`);

    console.log('Deleting gmail_accounts...');
    const accounts = await pool.query('DELETE FROM gmail_accounts WHERE tenant_id != \'demo\' RETURNING email');
    console.log(`  Deleted ${accounts.rowCount} gmail accounts`);
    if (accounts.rows.length > 0) {
      accounts.rows.forEach(row => console.log(`    - ${row.email}`));
    }

    console.log('Deleting users...');
    const users = await pool.query('DELETE FROM users WHERE tenant_id != \'demo\' RETURNING email');
    console.log(`  Deleted ${users.rowCount} users`);
    if (users.rows.length > 0) {
      users.rows.forEach(row => console.log(`    - ${row.email}`));
    }

    console.log('Deleting tenants (except demo)...');
    const tenants = await pool.query('DELETE FROM tenants WHERE name != \'demo\' RETURNING name');
    console.log(`  Deleted ${tenants.rowCount} tenants`);
    if (tenants.rows.length > 0) {
      tenants.rows.forEach(row => console.log(`    - ${row.name}`));
    }

    console.log('\n✅ Database reset complete!');
    console.log('\n📝 Next steps:');
    console.log('  1. Sign out of the app');
    console.log('  2. Sign in with your Google account');
    console.log('  3. Click "Sync Now" to pull your emails');
    console.log('  4. Each user will get their own isolated tenant');

    await pool.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
