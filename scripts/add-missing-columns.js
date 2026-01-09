// Script to check and add all missing columns to threads table
require('dotenv').config();
const { Pool } = require('pg');

const dbUrl = process.env.DATABASE_URL;
const pool = new Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1') ? false : { rejectUnauthorized: false }
});

const requiredColumns = [
    { name: 'is_replied', type: 'BOOLEAN DEFAULT false' },
    { name: 'folders', type: "TEXT[] DEFAULT ARRAY['inbox']::text[]" },
    { name: 'sender_email', type: 'TEXT' },
    { name: 'topic', type: 'TEXT' },
    { name: 'summary', type: 'TEXT' },
    { name: 'snippet', type: 'TEXT' },
    { name: 'confidence', type: 'NUMERIC(4,3)' },
    { name: 'stance', type: 'TEXT' },
    { name: 'type', type: "TEXT DEFAULT 'CORRESPONDENCE'" },
    { name: 'unread', type: 'BOOLEAN DEFAULT true' },
    { name: 'gmail_account_id', type: 'UUID' },
];

(async () => {
    try {
        console.log('Checking threads table columns...\n');

        // Get existing columns
        const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'threads'
    `);

        const existingColumns = result.rows.map(r => r.column_name);
        console.log('Existing columns:', existingColumns.join(', '));
        console.log('');

        // Add missing columns
        for (const col of requiredColumns) {
            if (!existingColumns.includes(col.name)) {
                console.log(`Adding missing column: ${col.name}...`);
                await pool.query(`ALTER TABLE threads ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
                console.log(`  ✅ Added ${col.name}`);
            } else {
                console.log(`  ✓ ${col.name} exists`);
            }
        }

        console.log('\n✅ All required columns are now present!');
        await pool.end();
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
})();
