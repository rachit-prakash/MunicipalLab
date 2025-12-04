/**
 * Vector embeddings for RAG (Retrieval-Augmented Generation)
 * This module handles creating embeddings from text using OpenAI's API
 */

export type EmbeddingModel = "text-embedding-3-small" | "text-embedding-3-large" | "text-embedding-ada-002"

export interface EmbeddingResult {
	embedding: number[]
	model: string
	usage: {
		prompt_tokens: number
		total_tokens: number
	}
}

/**
 * Generate an embedding vector for a given text
 * Uses OpenAI's embedding API
 */
export async function generateEmbedding(
	text: string,
	model: EmbeddingModel = "text-embedding-3-small"
): Promise<EmbeddingResult> {
	const apiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY

	if (!apiKey) {
		throw new Error("Missing OPENAI_API_KEY environment variable")
	}

	// Truncate text if too long (max ~8000 tokens for embeddings)
	const maxChars = 30000 // roughly 8k tokens
	const truncatedText = text.length > maxChars ? text.slice(0, maxChars) : text

	const response = await fetch("https://api.openai.com/v1/embeddings", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			model,
			input: truncatedText,
		}),
	})

	if (!response.ok) {
		const error = await response.text()
		throw new Error(`Embedding API failed: ${error}`)
	}

	const data = await response.json()
	return {
		embedding: data.data[0].embedding,
		model: data.model,
		usage: data.usage,
	}
}

/**
 * Generate embeddings for multiple texts in batch
 * More efficient than calling generateEmbedding multiple times
 */
export async function generateEmbeddingsBatch(
	texts: string[],
	model: EmbeddingModel = "text-embedding-3-small"
): Promise<EmbeddingResult[]> {
	const apiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY

	if (!apiKey) {
		throw new Error("Missing OPENAI_API_KEY environment variable")
	}

	// Truncate texts if too long
	const maxChars = 30000
	const truncatedTexts = texts.map((text) => (text.length > maxChars ? text.slice(0, maxChars) : text))

	const response = await fetch("https://api.openai.com/v1/embeddings", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			model,
			input: truncatedTexts,
		}),
	})

	if (!response.ok) {
		const error = await response.text()
		throw new Error(`Embedding API failed: ${error}`)
	}

	const data = await response.json()
	return data.data.map((item: any, index: number) => ({
		embedding: item.embedding,
		model: data.model,
		usage: {
			prompt_tokens: Math.floor(data.usage.prompt_tokens / texts.length),
			total_tokens: Math.floor(data.usage.total_tokens / texts.length),
		},
	}))
}

/**
 * Prepare email content for embedding
 * Combines relevant fields into a searchable text chunk
 */
export function prepareEmailForEmbedding(email: {
	subject?: string | null
	from_email?: string | null
	to_email?: string[] | null
	body_redacted?: string | null
	snippet?: string | null
	sentiment_score?: number | null
	urgency_level?: string | null
}): string {
	const parts: string[] = []

	if (email.subject) {
		parts.push(`Subject: ${email.subject}`)
	}

	if (email.from_email) {
		parts.push(`From: ${email.from_email}`)
	}

	if (email.to_email && email.to_email.length > 0) {
		parts.push(`To: ${email.to_email.join(", ")}`)
	}

	if (email.body_redacted) {
		parts.push(`Content: ${email.body_redacted}`)
	} else if (email.snippet) {
		parts.push(`Content: ${email.snippet}`)
	}

	// Add metadata for better context
	if (email.sentiment_score !== null && email.sentiment_score !== undefined) {
		const sentiment =
			email.sentiment_score > 0.3 ? "positive" : email.sentiment_score < -0.3 ? "negative" : "neutral"
		parts.push(`Sentiment: ${sentiment}`)
	}

	if (email.urgency_level) {
		parts.push(`Urgency: ${email.urgency_level}`)
	}

	return parts.join("\n")
}

