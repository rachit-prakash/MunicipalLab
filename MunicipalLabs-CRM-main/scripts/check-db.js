// Simple script to check database and gmail_accounts
require('dotenv').config();
const { Pool } = require('pg');

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.log('❌ DATABASE_URL is not set in .env file!');
    console.log('');
    console.log('Please add the following to your .env file:');
    console.log('DATABASE_URL=postgresql://user:password@host:5432/database');
    process.exit(1);
}

console.log('✅ DATABASE_URL is set');
console.log('Connecting to:', dbUrl.replace(/:[^:@]+@/, ':****@')); // Hide password

const pool = new Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1') ? false : { rejectUnauthorized: false }
});

(async () => {
    try {
        // Test connection
        const connTest = await pool.query('SELECT NOW()');
        console.log('✅ Database connected at:', connTest.rows[0].now);
        console.log('');

        // Check tables exist
        const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('tenants', 'users', 'gmail_accounts', 'threads', 'messages')
    `);

        console.log('=== Tables Found ===');
        if (tables.rows.length === 0) {
            console.log('❌ NO tables found! Database schema may not be set up.');
        } else {
            tables.rows.forEach(t => console.log(`  ✓ ${t.table_name}`));
        }
        console.log('');

        // Check gmail_accounts
        const gmailAccounts = await pool.query('SELECT COUNT(*) as count FROM gmail_accounts');
        console.log(`=== Gmail Accounts: ${gmailAccounts.rows[0].count} ===`);

        if (parseInt(gmailAccounts.rows[0].count) === 0) {
            console.log('❌ No Gmail accounts found!');
            console.log('→ This is why sync shows 0 messages.');
            console.log('→ You need to sign in with Google OAuth to create a gmail_account record.');
        } else {
            const accounts = await pool.query(`
        SELECT email, user_id, tenant_id, 
               encrypted_refresh_token IS NOT NULL as has_token,
               last_sync_at
        FROM gmail_accounts 
        LIMIT 5
      `);
            accounts.rows.forEach(a => {
                console.log(`  Email: ${a.email}`);
                console.log(`  User ID: ${a.user_id}`);
                console.log(`  Has Token: ${a.has_token}`);
                console.log(`  Last Sync: ${a.last_sync_at || 'Never'}`);
                console.log('');
            });
        }

        // Check threads
        const threads = await pool.query('SELECT COUNT(*) as count FROM threads');
        console.log(`=== Threads: ${threads.rows[0].count} ===`);

        // Check messages
        const messages = await pool.query('SELECT COUNT(*) as count FROM messages');
        console.log(`=== Messages: ${messages.rows[0].count} ===`);

        await pool.end();
    } catch (err) {
        console.error('❌ Database Error:', err.message);
        if (err.message.includes('ECONNREFUSED')) {
            console.log('');
            console.log('→ Database is not running or connection refused.');
            console.log('→ Make sure your PostgreSQL database is running.');
        }
        if (err.message.includes('password authentication failed')) {
            console.log('');
            console.log('→ Wrong database password in DATABASE_URL');
        }
        if (err.message.includes('does not exist')) {
            console.log('');
            console.log('→ Database or table does not exist. Run migrations first.');
        }
        process.exit(1);
    }
})();
