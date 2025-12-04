/**
 * RAG (Retrieval-Augmented Generation) utilities
 * Handles semantic search and context retrieval for the chatbot
 */

import { query, withTenant } from "./db"
import { generateEmbedding } from "./embeddings"

export interface RetrievedMessage {
	id: string
	thread_id: string
	from_email: string
	snippet: string
	body_redacted: string
	internal_date: Date
	similarity: number
}

export interface RetrievedThread {
	id: string
	subject: string
	summary: string
	topic: string
	stance: string
	last_message_ts: Date
	similarity: number
}

export interface RAGContext {
	messages: RetrievedMessage[]
	threads: RetrievedThread[]
	query: string
	totalResults: number
}

/**
 * Retrieve relevant emails and threads based on a user query
 * This is the main RAG function used by the chatbot
 */
export async function retrieveEmailContext(
	userQuery: string,
	tenantId: string,
	options: {
		maxMessages?: number
		maxThreads?: number
		minSimilarity?: number
		includeMessages?: boolean
		includeThreads?: boolean
	} = {}
): Promise<RAGContext> {
	const {
		maxMessages = 5,
		maxThreads = 3,
		minSimilarity = 0.5,
		includeMessages = true,
		includeThreads = true,
	} = options

	// Generate embedding for the user's query
	const { embedding: queryEmbedding } = await generateEmbedding(userQuery)

	const messages: RetrievedMessage[] = []
	const threads: RetrievedThread[] = []

	// Search messages if requested
	if (includeMessages) {
		const messageResults = await withTenant(tenantId, async (client) => {
			const result = await client.query(
				`SELECT * FROM search_messages_by_embedding($1::vector, $2::uuid, $3::int, $4::float)`,
				[`[${queryEmbedding.join(",")}]`, tenantId, maxMessages, minSimilarity]
			)
			return result.rows
		})
		messages.push(...messageResults)
	}

	// Search threads if requested
	if (includeThreads) {
		const threadResults = await withTenant(tenantId, async (client) => {
			const result = await client.query(
				`SELECT * FROM search_threads_by_embedding($1::vector, $2::uuid, $3::int, $4::float)`,
				[`[${queryEmbedding.join(",")}]`, tenantId, maxThreads, minSimilarity]
			)
			return result.rows
		})
		threads.push(...threadResults)
	}

	return {
		messages,
		threads,
		query: userQuery,
		totalResults: messages.length + threads.length,
	}
}

/**
 * Format RAG context into a readable string for the LLM
 */
export function formatRAGContextForLLM(context: RAGContext): string {
	const parts: string[] = []

	// Check if this is a chronological listing (similarity = 1.0 for all items)
	const isChronological = context.messages.length > 0 && context.messages[0].similarity === 1.0

	// Add thread summaries
	if (context.threads.length > 0) {
		parts.push(isChronological ? "## Email Threads (ordered by date):" : "## Relevant Email Threads:")
		context.threads.forEach((thread, i) => {
			if (isChronological) {
				parts.push(`\n### Thread ${i + 1}`)
			} else {
				parts.push(`\n### Thread ${i + 1} (similarity: ${(thread.similarity * 100).toFixed(1)}%)`)
			}
			parts.push(`Subject: ${thread.subject || "No subject"}`)
			if (thread.topic) parts.push(`Topic: ${thread.topic}`)
			if (thread.stance) parts.push(`Stance: ${thread.stance}`)
			if (thread.summary) parts.push(`Summary: ${thread.summary}`)
			parts.push(`Date: ${new Date(thread.last_message_ts).toLocaleDateString()}`)
		})
	}

	// Add individual messages
	if (context.messages.length > 0) {
		parts.push(isChronological ? "\n## Email Messages (ordered by date):" : "\n## Relevant Email Messages:")
		context.messages.forEach((msg, i) => {
			if (isChronological) {
				parts.push(`\n### Message ${i + 1}`)
			} else {
				parts.push(`\n### Message ${i + 1} (similarity: ${(msg.similarity * 100).toFixed(1)}%)`)
			}
			parts.push(`From: ${msg.from_email}`)
			parts.push(`Date: ${new Date(msg.internal_date).toLocaleDateString()}`)
			parts.push(`Content: ${msg.body_redacted || msg.snippet || "No content"}`)
		})
	}

	if (parts.length === 0) {
		return "No relevant emails found for this query. The user may be asking about something outside the email data."
	}

	return parts.join("\n")
}

/**
 * Get email analytics from the database
 * Useful for answering questions like "how many emails did I receive this week?"
 */
export async function getEmailAnalytics(
	tenantId: string,
	options: {
		startDate?: Date
		endDate?: Date
		topic?: string
		sender?: string
	} = {}
): Promise<{
	totalMessages: number
	totalThreads: number
	byTopic: Record<string, number>
	bySentiment: { positive: number; negative: number; neutral: number }
	byUrgency: Record<string, number>
	topSenders: Array<{ email: string; count: number }>
}> {
	const { startDate, endDate, topic, sender } = options

	// Build WHERE clause
	const conditions: string[] = ["m.tenant_id = $1"]
	const params: any[] = [tenantId]
	let paramIndex = 2

	if (startDate) {
		conditions.push(`m.internal_date >= $${paramIndex}`)
		params.push(startDate)
		paramIndex++
	}

	if (endDate) {
		conditions.push(`m.internal_date <= $${paramIndex}`)
		params.push(endDate)
		paramIndex++
	}

	if (sender) {
		conditions.push(`m.from_email ILIKE $${paramIndex}`)
		params.push(`%${sender}%`)
		paramIndex++
	}

	const whereClause = conditions.join(" AND ")

	const result = await withTenant(tenantId, async (client) => {
		// Total counts
		const totals = await client.query(
			`
      SELECT 
        COUNT(DISTINCT m.id) as total_messages,
        COUNT(DISTINCT m.thread_id) as total_threads
      FROM messages m
      WHERE ${whereClause}
    `,
			params
		)

		// By topic
		const topicQuery = topic
			? `
        SELECT t.topic, COUNT(*) as count
        FROM messages m
        JOIN threads t ON m.thread_id = t.id
        WHERE ${whereClause} AND t.topic = $${paramIndex}
        GROUP BY t.topic
      `
			: `
        SELECT t.topic, COUNT(*) as count
        FROM messages m
        JOIN threads t ON m.thread_id = t.id
        WHERE ${whereClause} AND t.topic IS NOT NULL
        GROUP BY t.topic
        ORDER BY count DESC
        LIMIT 10
      `
		const topicParams = topic ? [...params, topic] : params
		const byTopicResult = await client.query(topicQuery, topicParams)

		// By sentiment
		const sentiment = await client.query(
			`
      SELECT 
        COUNT(CASE WHEN sentiment_score > 0.3 THEN 1 END) as positive,
        COUNT(CASE WHEN sentiment_score < -0.3 THEN 1 END) as negative,
        COUNT(CASE WHEN sentiment_score BETWEEN -0.3 AND 0.3 THEN 1 END) as neutral
      FROM messages m
      WHERE ${whereClause} AND sentiment_score IS NOT NULL
    `,
			params
		)

		// By urgency
		const urgency = await client.query(
			`
      SELECT urgency_level, COUNT(*) as count
      FROM messages m
      WHERE ${whereClause} AND urgency_level IS NOT NULL
      GROUP BY urgency_level
    `,
			params
		)

		// Top senders
		const senders = await client.query(
			`
      SELECT from_email, COUNT(*) as count
      FROM messages m
      WHERE ${whereClause} AND from_email IS NOT NULL
      GROUP BY from_email
      ORDER BY count DESC
      LIMIT 10
    `,
			params
		)

		return {
			totals: totals.rows[0],
			byTopic: byTopicResult.rows,
			sentiment: sentiment.rows[0],
			urgency: urgency.rows,
			senders: senders.rows,
		}
	})

	// Format the results
	const byTopic: Record<string, number> = {}
	result.byTopic.forEach((row: any) => {
		byTopic[row.topic] = parseInt(row.count)
	})

	const byUrgency: Record<string, number> = {}
	result.urgency.forEach((row: any) => {
		byUrgency[row.urgency_level] = parseInt(row.count)
	})

	return {
		totalMessages: parseInt(result.totals.total_messages),
		totalThreads: parseInt(result.totals.total_threads),
		byTopic,
		bySentiment: {
			positive: parseInt(result.sentiment.positive) || 0,
			negative: parseInt(result.sentiment.negative) || 0,
			neutral: parseInt(result.sentiment.neutral) || 0,
		},
		byUrgency,
		topSenders: result.senders.map((row: any) => ({
			email: row.from_email,
			count: parseInt(row.count),
		})),
	}
}

/**
 * Determine if a query is asking for analytics vs semantic search
 */
export function isAnalyticsQuery(query: string): boolean {
	const analyticsKeywords = [
		"how many",
		"count",
		"total",
		"statistics",
		"stats",
		"analytics",
		"metrics",
		"number of",
		"breakdown",
		"distribution",
		"top senders",
		"most emails",
		"this week",
		"this month",
		"last week",
		"yesterday",
		"today",
	]

	const lowerQuery = query.toLowerCase()
	return analyticsKeywords.some((keyword) => lowerQuery.includes(keyword))
}

/**
 * Determine if a query is asking for chronological/listing access (newest, all emails, recent, etc.)
 */
export function isChronologicalQuery(query: string): boolean {
	const chronologicalKeywords = [
		"newest",
		"newest email",
		"latest",
		"latest email",
		"most recent",
		"recent email",
		"recent emails",
		"all emails",
		"all my emails",
		"show me all",
		"list all",
		"list emails",
		"show emails",
		"show all emails",
		"what emails",
		"what are my emails",
		"oldest",
		"oldest email",
		"first email",
		"last email",
	]

	const lowerQuery = query.toLowerCase()
	return chronologicalKeywords.some((keyword) => lowerQuery.includes(keyword))
}

/**
 * Retrieve emails chronologically (ordered by date) instead of by semantic similarity
 * Useful for queries like "newest email" or "show me all emails"
 */
export async function retrieveEmailsChronologically(
	tenantId: string,
	options: {
		limit?: number
		orderBy?: "newest" | "oldest"
		startDate?: Date
		endDate?: Date
	} = {}
): Promise<RAGContext> {
	const {
		limit = 20,
		orderBy = "newest",
		startDate,
		endDate,
	} = options

	const messages: RetrievedMessage[] = []
	const threads: RetrievedThread[] = []

	// Build WHERE clause for date filtering
	const conditions: string[] = ["m.tenant_id = $1"]
	const params: any[] = [tenantId]
	let paramIndex = 2

	if (startDate) {
		conditions.push(`m.internal_date >= $${paramIndex}`)
		params.push(startDate)
		paramIndex++
	}

	if (endDate) {
		conditions.push(`m.internal_date <= $${paramIndex}`)
		params.push(endDate)
		paramIndex++
	}

	const whereClause = conditions.join(" AND ")
	const orderDirection = orderBy === "newest" ? "DESC" : "ASC"

	// Retrieve messages chronologically
	const messageResults = await withTenant(tenantId, async (client) => {
		const result = await client.query(
			`
			SELECT 
				m.id,
				m.thread_id,
				m.from_email,
				m.snippet,
				m.body_redacted,
				m.internal_date,
				1.0 as similarity
			FROM messages m
			WHERE ${whereClause}
			ORDER BY m.internal_date ${orderDirection}
			LIMIT $${paramIndex}
			`,
			[...params, limit]
		)
		return result.rows.map((row: any) => ({
			id: row.id,
			thread_id: row.thread_id,
			from_email: row.from_email,
			snippet: row.snippet,
			body_redacted: row.body_redacted,
			internal_date: row.internal_date,
			similarity: 1.0, // Not a similarity score, but we use 1.0 to indicate it's a chronological result
		}))
	})

	messages.push(...messageResults)

	// Also get threads for context (simplified - just get threads that match the date range)
	const threadConditions: string[] = ["t.tenant_id = $1"]
	const threadParams: any[] = [tenantId]
	let threadParamIndex = 2

	if (startDate) {
		threadConditions.push(`t.last_message_ts >= $${threadParamIndex}`)
		threadParams.push(startDate)
		threadParamIndex++
	}

	if (endDate) {
		threadConditions.push(`t.last_message_ts <= $${threadParamIndex}`)
		threadParams.push(endDate)
		threadParamIndex++
	}

	const threadWhereClause = threadConditions.join(" AND ")

	const threadResults = await withTenant(tenantId, async (client) => {
		const result = await client.query(
			`
			SELECT 
				t.id,
				t.subject,
				t.summary,
				t.topic,
				t.stance,
				t.last_message_ts,
				1.0 as similarity
			FROM threads t
			WHERE ${threadWhereClause}
			ORDER BY t.last_message_ts ${orderDirection}
			LIMIT $${threadParamIndex}
			`,
			[...threadParams, limit]
		)
		return result.rows.map((row: any) => ({
			id: row.id,
			subject: row.subject,
			summary: row.summary,
			topic: row.topic,
			stance: row.stance,
			last_message_ts: row.last_message_ts,
			similarity: 1.0,
		}))
	})

	threads.push(...threadResults)

	return {
		messages,
		threads,
		query: `chronological listing (${orderBy})`,
		totalResults: messages.length + threads.length,
	}
}

