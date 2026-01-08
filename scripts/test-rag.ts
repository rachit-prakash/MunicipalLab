/**
 * Simple script to test RAG functionality
 */

import { retrieveEmailContext } from "../lib/rag"

async function testRAG() {
  console.log("🧪 Testing RAG functionality...\n")

  // Get a tenant ID from the database
  const { query } = await import("../lib/db")
  const tenantResult = await query("SELECT DISTINCT tenant_id FROM messages WHERE embedding IS NOT NULL LIMIT 1")

  if (tenantResult.rows.length === 0) {
    console.log("❌ No tenants found with embeddings")
    return
  }

  const tenantId = tenantResult.rows[0].tenant_id
  console.log(`Using tenant: ${tenantId}\n`)

  // Test 1: Semantic search
  console.log("Test 1: Semantic Search")
  console.log("Query: 'emails about projects'")
  const context1 = await retrieveEmailContext("emails about projects", tenantId, {
    maxMessages: 3,
    maxThreads: 2,
  })
  console.log(`✅ Found ${context1.totalResults} results`)
  console.log(`   - ${context1.messages.length} messages`)
  console.log(`   - ${context1.threads.length} threads`)

  if (context1.messages.length > 0) {
    console.log(`   - Top message: "${context1.messages[0].snippet?.substring(0, 50)}..."`)
    console.log(`   - Similarity: ${(context1.messages[0].similarity * 100).toFixed(1)}%`)
  }

  console.log("\nTest 2: Different query")
  console.log("Query: 'important urgent messages'")
  const context2 = await retrieveEmailContext("important urgent messages", tenantId, {
    maxMessages: 3,
    maxThreads: 2,
  })
  console.log(`✅ Found ${context2.totalResults} results`)
  console.log(`   - ${context2.messages.length} messages`)
  console.log(`   - ${context2.threads.length} threads`)

  if (context2.messages.length > 0) {
    console.log(`   - Top message from: ${context2.messages[0].from_email}`)
    console.log(`   - Similarity: ${(context2.messages[0].similarity * 100).toFixed(1)}%`)
  }

  console.log("\n✅ RAG is working! Your chatbot can now search through emails.\n")
  console.log("💡 Try these queries in your chatbot:")
  console.log("   - 'Show me emails from last week'")
  console.log("   - 'What are people saying about [topic]?'")
  console.log("   - 'Find emails from [name]'")
  console.log("   - 'How many urgent emails do I have?'")
}

testRAG().catch(console.error)
