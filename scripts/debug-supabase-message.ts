/**
 * Debug script to check Supabase message content in database
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/debug-supabase-message.ts
 */

import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("ERROR: DATABASE_URL environment variable is required");
  process.exit(1);
}

const isLocalDb =
  connectionString.includes("localhost") ||
  connectionString.includes("127.0.0.1");

const pool = new Pool({
  connectionString,
  max: 5,
  ssl: isLocalDb ? false : { rejectUnauthorized: false },
});

async function debug() {
  try {
    console.log("Checking Supabase messages in database...\n");

    // Find messages from Supabase
    const result = await pool.query(
      `SELECT
        m.gmail_message_id,
        m.from_email,
        m.internal_date,
        LENGTH(m.snippet) as snippet_length,
        LEFT(m.snippet, 100) as snippet_preview,
        LENGTH(m.body_redacted) as body_length,
        LEFT(m.body_redacted, 200) as body_preview,
        CASE
          WHEN m.body_redacted IS NULL THEN 'NULL'
          WHEN LENGTH(m.body_redacted) = 0 THEN 'EMPTY'
          WHEN m.body_redacted = m.snippet THEN 'SAME_AS_SNIPPET'
          ELSE 'DIFFERENT'
        END as body_status
      FROM messages m
      WHERE m.from_email ILIKE '%supabase%'
      ORDER BY m.internal_date DESC
      LIMIT 5`
    );

    if (result.rows.length === 0) {
      console.log("No Supabase messages found in database.");
      return;
    }

    console.log(`Found ${result.rows.length} Supabase message(s):\n`);

    for (const row of result.rows) {
      console.log("=".repeat(80));
      console.log(`Message ID: ${row.gmail_message_id}`);
      console.log(`From: ${row.from_email}`);
      console.log(`Date: ${row.internal_date}`);
      console.log(`\nSnippet length: ${row.snippet_length} chars`);
      console.log(`Snippet preview: ${row.snippet_preview}...`);
      console.log(`\nBody length: ${row.body_length} chars`);
      console.log(`Body status: ${row.body_status}`);
      console.log(`Body preview: ${row.body_preview}...`);
      console.log("=".repeat(80));
      console.log();
    }

    // Check if any have NULL or empty bodies
    const nullCount = result.rows.filter(r => r.body_status === 'NULL').length;
    const emptyCount = result.rows.filter(r => r.body_status === 'EMPTY').length;
    const sameCount = result.rows.filter(r => r.body_status === 'SAME_AS_SNIPPET').length;

    console.log("\nSummary:");
    console.log(`- NULL bodies: ${nullCount}`);
    console.log(`- Empty bodies: ${emptyCount}`);
    console.log(`- Same as snippet: ${sameCount}`);
    console.log(`- Proper bodies: ${result.rows.length - nullCount - emptyCount - sameCount}`);

    if (nullCount > 0 || emptyCount > 0 || sameCount > 0) {
      console.log("\n⚠️  Issue detected: Some messages have missing or truncated body content.");
      console.log("💡 Solution: Use the refresh button in the UI to re-fetch from Gmail.");
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pool.end();
  }
}

debug();
