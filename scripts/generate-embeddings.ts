/**
 * Generate embeddings for existing emails and threads
 * Run this script after adding the pgvector extension to populate embeddings
 *
 * Usage: npx tsx scripts/generate-embeddings.ts [--batch-size=50] [--tenant-id=xxx]
 */

import { query, withTenant } from "../lib/db"
import { generateEmbeddingsBatch, prepareEmailForEmbedding } from "../lib/embeddings"

interface Message {
	id: string
	thread_id: string
	subject?: string
	from_email?: string
	to_email?: string[]
	body_redacted?: string
	snippet?: string
	sentiment_score?: number
	urgency_level?: string
}

interface Thread {
	id: string
	subject?: string
	summary?: string
	topic?: string
	stance?: string
}

async function generateEmbeddingsForMessages(tenantId: string, batchSize: number = 50) {
	console.log(`\n🔍 Processing messages for tenant ${tenantId}...`)

	// Get total count
	const countResult = await withTenant(tenantId, async (client) => {
		return client.query(
			`SELECT COUNT(*) as total FROM messages WHERE tenant_id = $1 AND embedding IS NULL`,
			[tenantId]
		)
	})
	const totalMessages = parseInt(countResult.rows[0]?.total || "0")

	if (totalMessages === 0) {
		console.log("✅ All messages already have embeddings!")
		return
	}

	console.log(`📧 Found ${totalMessages} messages without embeddings`)

	let processed = 0
	let offset = 0

	while (offset < totalMessages) {
		// Fetch a batch of messages
		const messages = await withTenant(tenantId, async (client) => {
			const result = await client.query(
				`
        SELECT 
          m.id, m.thread_id, t.subject, m.from_email, m.to_email, 
          m.body_redacted, m.snippet, m.sentiment_score, m.urgency_level
        FROM messages m
        LEFT JOIN threads t ON m.thread_id = t.id
        WHERE m.tenant_id = $1 AND m.embedding IS NULL
        ORDER BY m.created_at DESC
        LIMIT $2 OFFSET $3
      `,
				[tenantId, batchSize, offset]
			)
			return result.rows as Message[]
		})

		if (messages.length === 0) break

		console.log(`\n📦 Processing batch ${Math.floor(offset / batchSize) + 1} (${messages.length} messages)...`)

		try {
			// Prepare texts for embedding
			const texts = messages.map((msg) => prepareEmailForEmbedding(msg))

			// Generate embeddings in batch
			const embeddings = await generateEmbeddingsBatch(texts)

			// Update database with embeddings
			for (let i = 0; i < messages.length; i++) {
				const message = messages[i]
				const embedding = embeddings[i]

				await withTenant(tenantId, async (client) => {
					await client.query(`UPDATE messages SET embedding = $1 WHERE id = $2`, [
						`[${embedding.embedding.join(",")}]`,
						message.id,
					])
				})
			}

			processed += messages.length
			console.log(
				`✅ Processed ${processed}/${totalMessages} messages (${((processed / totalMessages) * 100).toFixed(1)}%)`
			)

			// Rate limiting: wait a bit between batches to avoid API limits
			if (offset + batchSize < totalMessages) {
				console.log("⏳ Waiting 1 second before next batch...")
				await new Promise((resolve) => setTimeout(resolve, 1000))
			}
		} catch (error) {
			console.error(`❌ Error processing batch at offset ${offset}:`, error)
			// Continue with next batch
		}

		offset += batchSize
	}

	console.log(`\n✅ Finished processing messages: ${processed} embeddings generated`)
}

async function generateEmbeddingsForThreads(tenantId: string, batchSize: number = 50) {
	console.log(`\n🔍 Processing threads for tenant ${tenantId}...`)

	// Get total count
	const countResult = await withTenant(tenantId, async (client) => {
		return client.query(`SELECT COUNT(*) as total FROM threads WHERE tenant_id = $1 AND embedding IS NULL`, [
			tenantId,
		])
	})
	const totalThreads = parseInt(countResult.rows[0]?.total || "0")

	if (totalThreads === 0) {
		console.log("✅ All threads already have embeddings!")
		return
	}

	console.log(`🧵 Found ${totalThreads} threads without embeddings`)

	let processed = 0
	let offset = 0

	while (offset < totalThreads) {
		// Fetch a batch of threads
		const threads = await withTenant(tenantId, async (client) => {
			const result = await client.query(
				`
        SELECT id, subject, summary, topic, stance
        FROM threads
        WHERE tenant_id = $1 AND embedding IS NULL
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `,
				[tenantId, batchSize, offset]
			)
			return result.rows as Thread[]
		})

		if (threads.length === 0) break

		console.log(`\n📦 Processing batch ${Math.floor(offset / batchSize) + 1} (${threads.length} threads)...`)

		try {
			// Prepare texts for embedding
			const texts = threads.map((thread) => {
				const parts: string[] = []
				if (thread.subject) parts.push(`Subject: ${thread.subject}`)
				if (thread.topic) parts.push(`Topic: ${thread.topic}`)
				if (thread.stance) parts.push(`Stance: ${thread.stance}`)
				if (thread.summary) parts.push(`Summary: ${thread.summary}`)
				return parts.join("\n")
			})

			// Generate embeddings in batch
			const embeddings = await generateEmbeddingsBatch(texts)

			// Update database with embeddings
			for (let i = 0; i < threads.length; i++) {
				const thread = threads[i]
				const embedding = embeddings[i]

				await withTenant(tenantId, async (client) => {
					await client.query(`UPDATE threads SET embedding = $1 WHERE id = $2`, [
						`[${embedding.embedding.join(",")}]`,
						thread.id,
					])
				})
			}

			processed += threads.length
			console.log(
				`✅ Processed ${processed}/${totalThreads} threads (${((processed / totalThreads) * 100).toFixed(1)}%)`
			)

			// Rate limiting
			if (offset + batchSize < totalThreads) {
				console.log("⏳ Waiting 1 second before next batch...")
				await new Promise((resolve) => setTimeout(resolve, 1000))
			}
		} catch (error) {
			console.error(`❌ Error processing batch at offset ${offset}:`, error)
		}

		offset += batchSize
	}

	console.log(`\n✅ Finished processing threads: ${processed} embeddings generated`)
}

async function main() {
	console.log("🚀 Starting embedding generation...")

	// Parse command line arguments
	const args = process.argv.slice(2)
	const batchSizeArg = args.find((arg) => arg.startsWith("--batch-size="))
	const tenantIdArg = args.find((arg) => arg.startsWith("--tenant-id="))

	const batchSize = batchSizeArg ? parseInt(batchSizeArg.split("=")[1]) : 50
	let tenantIds: string[] = []

	if (tenantIdArg) {
		tenantIds = [tenantIdArg.split("=")[1]]
	} else {
		// Get all tenant IDs
		const result = await query(`SELECT id FROM tenants ORDER BY created_at`)
		tenantIds = result.rows.map((row) => row.id)
	}

	console.log(`\n📊 Configuration:`)
	console.log(`   - Batch size: ${batchSize}`)
	console.log(`   - Tenants: ${tenantIds.length}`)

	// Process each tenant
	for (let i = 0; i < tenantIds.length; i++) {
		const tenantId = tenantIds[i]
		console.log(`\n${"=".repeat(60)}`)
		console.log(`📁 Processing tenant ${i + 1}/${tenantIds.length}: ${tenantId}`)
		console.log("=".repeat(60))

		try {
			await generateEmbeddingsForMessages(tenantId, batchSize)
			await generateEmbeddingsForThreads(tenantId, batchSize)
		} catch (error) {
			console.error(`❌ Error processing tenant ${tenantId}:`, error)
		}
	}

	console.log(`\n${"=".repeat(60)}`)
	console.log("✅ All done! Your emails now have embeddings for RAG.")
	console.log("=".repeat(60))
	console.log("\n💡 Next steps:")
	console.log("   1. Test the chatbot by asking questions about your emails")
	console.log("   2. Try analytics queries like 'how many emails this week?'")
	console.log("   3. Try semantic search like 'show me emails about zoning'")
}

main().catch((error) => {
	console.error("Fatal error:", error)
	process.exit(1)
})


