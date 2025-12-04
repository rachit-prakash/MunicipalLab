/**
 * Helper to generate embeddings during sync
 * This should be called after messages are inserted/updated
 */

import { withTenant } from "./db"
import { generateEmbedding, prepareEmailForEmbedding } from "./embeddings"

/**
 * Generate and store embedding for a single message
 * Call this after inserting/updating a message during sync
 */
export async function generateMessageEmbedding(
	tenantId: string,
	messageId: string,
	messageData: {
		subject?: string
		from_email?: string
		to_email?: string[]
		body_redacted?: string
		snippet?: string
		sentiment_score?: number
		urgency_level?: string
	}
): Promise<void> {
	try {
		// Prepare text for embedding
		const text = prepareEmailForEmbedding(messageData)

		// Generate embedding
		const { embedding } = await generateEmbedding(text)

		// Store in database
		await withTenant(tenantId, async (client) => {
			await client.query(`UPDATE messages SET embedding = $1 WHERE id = $2 AND tenant_id = $3`, [
				`[${embedding.join(",")}]`,
				messageId,
				tenantId,
			])
		})
	} catch (error) {
		console.error(`Failed to generate embedding for message ${messageId}:`, error)
		// Don't throw - embeddings are optional enhancement
	}
}

/**
 * Generate and store embedding for a thread
 * Call this after updating thread summary/topic/stance
 */
export async function generateThreadEmbedding(
	tenantId: string,
	threadId: string,
	threadData: {
		subject?: string
		summary?: string
		topic?: string
		stance?: string
	}
): Promise<void> {
	try {
		// Prepare text for embedding
		const parts: string[] = []
		if (threadData.subject) parts.push(`Subject: ${threadData.subject}`)
		if (threadData.topic) parts.push(`Topic: ${threadData.topic}`)
		if (threadData.stance) parts.push(`Stance: ${threadData.stance}`)
		if (threadData.summary) parts.push(`Summary: ${threadData.summary}`)

		if (parts.length === 0) {
			return // Nothing to embed
		}

		const text = parts.join("\n")

		// Generate embedding
		const { embedding } = await generateEmbedding(text)

		// Store in database
		await withTenant(tenantId, async (client) => {
			await client.query(`UPDATE threads SET embedding = $1 WHERE id = $2 AND tenant_id = $3`, [
				`[${embedding.join(",")}]`,
				threadId,
				tenantId,
			])
		})
	} catch (error) {
		console.error(`Failed to generate embedding for thread ${threadId}:`, error)
		// Don't throw - embeddings are optional enhancement
	}
}

