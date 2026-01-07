import { query } from "@/lib/db"

async function checkTopics() {
  try {
    // Check if topics table exists and has data
    const topicsResult = await query(`
      SELECT COUNT(*) as count FROM topics
    `)
    console.log('Topics count:', topicsResult.rows[0]?.count)

    // Check if threads have topic_id assigned
    const threadsWithTopics = await query(`
      SELECT
        COUNT(*) as total_threads,
        COUNT(topic_id) as threads_with_topic
      FROM threads
    `)
    console.log('Threads:', threadsWithTopics.rows[0])

    // Show sample topics
    const sampleTopics = await query(`
      SELECT id, name, created_at
      FROM topics
      LIMIT 10
    `)
    console.log('Sample topics:', sampleTopics.rows)

  } catch (error) {
    console.error('Error checking topics:', error)
  }
}

checkTopics()
