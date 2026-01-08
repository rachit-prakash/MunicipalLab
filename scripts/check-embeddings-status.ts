import { query } from '../lib/db';

async function checkEmbeddingsStatus() {
  try {
    console.log('Checking embeddings status...\n');

    // Check if messages table has any embeddings
    const result = await query(`
      SELECT
        COUNT(*) as total_messages,
        COUNT(embedding) as messages_with_embeddings,
        COUNT(CASE WHEN embedding IS NULL THEN 1 END) as messages_without_embeddings
      FROM messages
    `);

    console.log('=== Message Embeddings Status ===');
    console.log(JSON.stringify(result.rows[0], null, 2));

    // Check threads
    const threadResult = await query(`
      SELECT
        COUNT(*) as total_threads,
        COUNT(embedding) as threads_with_embeddings,
        COUNT(CASE WHEN embedding IS NULL THEN 1 END) as threads_without_embeddings
      FROM threads
    `);

    console.log('\n=== Thread Embeddings Status ===');
    console.log(JSON.stringify(threadResult.rows[0], null, 2));

    // Check if search functions exist
    const funcCheck = await query(`
      SELECT
        routine_name,
        routine_type
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name LIKE '%embedding%'
    `);

    console.log('\n=== Embedding Search Functions ===');
    if (funcCheck.rows.length === 0) {
      console.log('⚠️  No embedding search functions found!');
      console.log('You may need to run: scripts/add-embeddings.sql');
    } else {
      funcCheck.rows.forEach(row => {
        console.log(`✓ ${row.routine_name} (${row.routine_type})`);
      });
    }

    // Check sample of messages
    const sampleMessages = await query(`
      SELECT
        id,
        from_email,
        subject,
        embedding IS NOT NULL as has_embedding
      FROM messages
      ORDER BY internal_date DESC
      LIMIT 5
    `);

    console.log('\n=== Sample Recent Messages ===');
    sampleMessages.rows.forEach((msg, i) => {
      console.log(`${i + 1}. ${msg.has_embedding ? '✓' : '✗'} From: ${msg.from_email} - ${msg.subject || '(no subject)'}`);
    });

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

checkEmbeddingsStatus();
