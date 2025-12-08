import { withTenant } from "@/lib/db"
import type { MessageAnalysis, MessageForAnalysis } from "@/lib/analysis"
import { senderTypeToFolders } from "@/lib/message-filter"

export type PersistAnalysisInput = {
  tenantId: string
  messageId: string
  threadId: string
  subject?: string | null
  snippet?: string | null
  fromEmail?: string | null
  analysis: MessageAnalysis
}

export async function persistMessageAnalysis({
  tenantId,
  messageId,
  threadId,
  subject,
  snippet,
  fromEmail,
  analysis,
}: PersistAnalysisInput): Promise<void> {
  const summary = snippet?.trim() || subject?.trim() || null
  const topic = analysis.topic?.trim() || null
  const urgencyLevel = analysis.urgencyLevel ?? "low"
  const urgencyReasons = analysis.urgencyReasons ?? []
  const sentimentScore =
    typeof analysis.sentimentScore === "number"
      ? clamp(analysis.sentimentScore, -1, 1)
      : null
  const confidence =
    typeof analysis.confidence === "number"
      ? clamp(analysis.confidence, 0, 1)
      : 0.75
  const senderType = analysis.senderType ?? "uncertain"

  // Convert AI senderType to folder IDs
  const folders = senderTypeToFolders(senderType)

  await withTenant(tenantId, async (client) => {
    await client.query(
      `UPDATE messages
       SET sentiment_score = $1,
           urgency_level = $2,
           urgency_reasons = $3,
           analyzed_at = NOW()
       WHERE id = $4`,
      [sentimentScore, urgencyLevel, urgencyReasons, messageId],
    )

    // Check if folders column exists (for backwards compatibility)
    const hasFolders = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'threads' AND column_name = 'folders'
    `)

    if (hasFolders.rows.length > 0) {
      // New schema with folders column
      await client.query(
        `UPDATE threads
         SET topic = COALESCE($1, topic),
             sender_email = COALESCE($2, sender_email),
             summary = COALESCE($3, summary),
             confidence = COALESCE($4, confidence),
             folders = $5,
             updated_at = NOW()
         WHERE id = $6`,
        [topic, fromEmail, summary, confidence, folders, threadId],
      )
    } else {
      // Old schema with sender_type column (fallback)
      await client.query(
        `UPDATE threads
         SET topic = COALESCE($1, topic),
             sender_email = COALESCE($2, sender_email),
             summary = COALESCE($3, summary),
             confidence = COALESCE($4, confidence),
             sender_type = COALESCE($5, sender_type),
             updated_at = NOW()
         WHERE id = $6`,
        [topic, fromEmail, summary, confidence, senderType, threadId],
      )
    }
  })
}

export function isMessageEligibleForAnalysis(
  params: MessageForAnalysis & { isOutbound?: boolean },
): boolean {
  if (params.isOutbound) return false
  const text =
    (params.subject ?? "") + (params.snippet ?? "") + (params.body ?? "")
  return text.trim().length > 0
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}



