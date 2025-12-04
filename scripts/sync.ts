import { query, withTenant } from "@/lib/db";
import { getAccessToken } from "@/lib/googleTokens";
import { analyzeMessage } from "@/lib/analysis";
import {
  isMessageEligibleForAnalysis,
  persistMessageAnalysis,
} from "@/lib/messageAnalysis";

// cron safe usage of the incremental sync.
export async function runIncrementalSync(
  tenantId: string,
  userId: string
): Promise<void> {
  await ensureThreadsSchema()
  if (!tenantId || !userId) {
    throw new Error("runIncrementalSync requires both tenantId and userId.");
  }

  // we read the gmail_accounts.history_id for (tenantId, userId).
  const accountInfo = await withTenant(tenantId, async (client) => {
    const result = await client.query<{
      history_id: string | null;
      email: string;
    }>(
      `SELECT history_id, email FROM gmail_accounts WHERE user_id = $1 LIMIT 1`,
      [userId]
    );

    if (!result.rows.length) {
      throw new Error(
        `No Gmail account found for user ${userId} in tenant ${tenantId}.`
      );
    }

    return result.rows[0];
  });

  // Step 2: Mint access token
  const accessToken = await getAccessToken(tenantId, userId);

  // Step 3: Bootstrap or incremental sync
  if (!accountInfo.history_id) {
    await bootstrapSync(tenantId, userId, accessToken, accountInfo.email);
  } else {
    await incrementalSync(
      tenantId,
      userId,
      accessToken,
      accountInfo.history_id,
      accountInfo.email
    );
  }

  // Step 5: Update last_sync_at
  await withTenant(tenantId, async (client) => {
    await client.query(
      `UPDATE gmail_accounts SET last_sync_at = NOW() WHERE user_id = $1`,
      [userId]
    );
  });
}

/**
 * Bootstrap sync: list recent threads/messages and set initial history_id.
 */
async function bootstrapSync(
  tenantId: string,
  userId: string,
  accessToken: string,
  userEmail: string
): Promise<void> {
  // Fetch a small window of recent messages (e.g., last 10 messages)
  const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10`;

  const listResponse = await fetchWithRetry(listUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const listData = (await listResponse.json()) as {
    messages?: Array<{ id: string; threadId: string }>;
    resultSizeEstimate?: number;
  };

  const messages = listData.messages || [];

  // Fetch and upsert each message
  for (const msg of messages) {
    await fetchAndUpsertMessage(
      tenantId,
      userId,
      accessToken,
      msg.id,
      msg.threadId,
      userEmail
    );
  }

  // Get current historyId from profile
  const profileUrl = `https://gmail.googleapis.com/gmail/v1/users/me/profile`;
  const profileResponse = await fetchWithRetry(profileUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const profileData = (await profileResponse.json()) as {
    historyId?: string;
  };

  if (profileData.historyId) {
    await withTenant(tenantId, async (client) => {
      await client.query(
        `UPDATE gmail_accounts SET history_id = $1 WHERE user_id = $2`,
        [profileData.historyId, userId]
      );
    });
  }
}

/**
 * Incremental sync: process history deltas since last history_id.
 */
async function incrementalSync(
  tenantId: string,
  userId: string,
  accessToken: string,
  startHistoryId: string,
  userEmail: string
): Promise<void> {
  let nextPageToken: string | undefined;
  let newestHistoryId = startHistoryId;

  do {
    const url = new URL(
      `https://gmail.googleapis.com/gmail/v1/users/me/history`
    );
    url.searchParams.set("startHistoryId", startHistoryId);
    url.searchParams.set("historyTypes", "messageAdded");
    if (nextPageToken) {
      url.searchParams.set("pageToken", nextPageToken);
    }

    let response: Response;
    try {
      response = await fetchWithRetry(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : String(error ?? "");
      if (message.includes("status 410") || message.includes("historyId")) {
        // History ID is too old/invalid – bootstrap to reset the sync state.
        await bootstrapSync(tenantId, userId, accessToken, userEmail);
        return;
      }
      throw error;
    }

    const data = (await response.json()) as {
      history?: Array<{
        id?: string;
        messagesAdded?: Array<{
          message?: { id: string; threadId: string };
        }>;
      }>;
      nextPageToken?: string;
      historyId?: string;
    };

    // Process each history record
    const historyRecords = data.history || [];
    for (const record of historyRecords) {
      if (record.id && record.id > newestHistoryId) {
        newestHistoryId = record.id;
      }

      const messagesAdded = record.messagesAdded || [];
      for (const added of messagesAdded) {
        if (added.message) {
          await fetchAndUpsertMessage(
            tenantId,
            userId,
            accessToken,
            added.message.id,
            added.message.threadId,
            userEmail
          );
        }
      }
    }

    // Update to newest historyId from response
    if (data.historyId && data.historyId > newestHistoryId) {
      newestHistoryId = data.historyId;
    }

    nextPageToken = data.nextPageToken;
  } while (nextPageToken);

  // Update stored history_id
  if (newestHistoryId !== startHistoryId) {
    await withTenant(tenantId, async (client) => {
      await client.query(
        `UPDATE gmail_accounts SET history_id = $1 WHERE user_id = $2`,
        [newestHistoryId, userId]
      );
    });
  }
}

type MessageUpsertResult = {
  inserted: boolean
  messageId?: string
  threadId?: string
  subject?: string
  snippet?: string
  body?: string
  fromEmail?: string
  toEmails: string[]
  isOutbound: boolean
}

/**
 * Fetch a message from Gmail and upsert it into the database (idempotent).
 */
async function fetchAndUpsertMessage(
  tenantId: string,
  userId: string,
  accessToken: string,
  messageId: string,
  threadId: string,
  userEmail: string,
): Promise<void> {
  const msgUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`
  let msgResponse: Response
  try {
    msgResponse = await fetchWithRetry(msgUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error ?? "")
    if (message.includes("status 404")) {
      console.warn(
        `Gmail message ${messageId} (thread ${threadId}) not found; skipping.`,
      )
      return
    }
    throw error
  }

  const msgData = (await msgResponse.json()) as {
    id: string
    threadId: string
    internalDate?: string
    snippet?: string
    payload?: {
      headers?: Array<{ name: string; value: string }>
      parts?: any[]
      body?: { data?: string }
    }
  }

  const headers = msgData.payload?.headers || []
  const fromEmail =
    headers.find((h) => h.name.toLowerCase() === "from")?.value || ""
  const toEmailValue =
    headers.find((h) => h.name.toLowerCase() === "to")?.value || ""
  const subject =
    headers.find((h) => h.name.toLowerCase() === "subject")?.value || ""

  const internalDate = msgData.internalDate
    ? new Date(parseInt(msgData.internalDate))
    : new Date()
  const snippet = msgData.snippet || ""
  const bodyPlain = extractBodyText(msgData.payload) ?? snippet

  const toEmailArray = toEmailValue
    .split(",")
    .map((e) => e.trim())
    .filter((e) => e)

  const isOutbound = fromEmail.toLowerCase().includes(userEmail.toLowerCase())
  const threadType = detectCasework(`${subject}\n${snippet}`)
    ? "CASEWORK"
    : "CORRESPONDENCE"

  const upsertResult = await withTenant(tenantId, async (client) => {
    const threadResult = await client.query<{ id: string }>(
      `INSERT INTO threads (
          tenant_id,
          gmail_thread_id,
          subject,
          last_message_ts,
          status,
          sender_email,
          summary,
          type,
          unread
        )
        VALUES ($1, $2, $3, $4, 'open', $5, $6, $7, $8)
        ON CONFLICT (gmail_thread_id)
        DO UPDATE SET
          subject = COALESCE(EXCLUDED.subject, threads.subject),
          sender_email = COALESCE(EXCLUDED.sender_email, threads.sender_email),
          summary = COALESCE(EXCLUDED.summary, threads.summary),
          type = COALESCE(EXCLUDED.type, threads.type),
          unread = CASE
            WHEN EXCLUDED.unread THEN true
            ELSE threads.unread
          END,
          last_message_ts = GREATEST(threads.last_message_ts, EXCLUDED.last_message_ts),
          updated_at = NOW()
        RETURNING id`,
      [
        tenantId,
        threadId,
        subject,
        internalDate,
        fromEmail,
        snippet || subject,
        threadType,
        !isOutbound,
      ],
    )

    const finalThreadId =
      threadResult.rows[0]?.id ??
      (
        await client.query<{ id: string }>(
          `SELECT id FROM threads WHERE gmail_thread_id = $1 LIMIT 1`,
          [threadId],
        )
      ).rows[0]?.id

    if (!finalThreadId) {
      throw new Error(`Failed to create or fetch thread ${threadId}`)
    }

    const insertResult = await client.query<{ id: string }>(
      `INSERT INTO messages (
          tenant_id,
          thread_id,
          gmail_message_id,
          from_email,
          to_email,
          internal_date,
          snippet,
          body_redacted,
          is_outbound
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (gmail_message_id) DO NOTHING
        RETURNING id`,
      [
        tenantId,
        finalThreadId,
        messageId,
        fromEmail,
        toEmailArray,
        internalDate,
        snippet,
        bodyPlain,
        isOutbound,
      ],
    )

    const inserted = insertResult.rowCount ?? false
    return {
      inserted,
      messageId: insertResult.rows[0]?.id ?? undefined,
      threadId: finalThreadId ?? undefined,
      subject,
      snippet,
      body: bodyPlain ?? undefined,
      fromEmail: fromEmail ?? undefined,
      toEmails: toEmailArray ?? [],
      isOutbound,
    } as MessageUpsertResult
  })

  if (
    !upsertResult.inserted ||
    !upsertResult.messageId ||
    !upsertResult.threadId ||
    upsertResult.isOutbound
  ) {
    return
  }

  if (
    !isMessageEligibleForAnalysis({
      subject: upsertResult.subject,
      snippet: upsertResult.snippet,
      body: upsertResult.body,
      from: upsertResult.fromEmail,
      to: upsertResult.toEmails,
      isOutbound: upsertResult.isOutbound,
    })
  ) {
    return
  }

  try {
    const analysis = await analyzeMessage({
      subject: upsertResult.subject,
      snippet: upsertResult.snippet,
      body: upsertResult.body,
      from: upsertResult.fromEmail,
      to: upsertResult.toEmails,
    })

    await persistMessageAnalysis({
      tenantId,
      messageId: upsertResult.messageId,
      threadId: upsertResult.threadId,
      subject: upsertResult.subject,
      snippet: upsertResult.snippet,
      fromEmail: upsertResult.fromEmail,
      analysis,
    })
  } catch (error) {
    console.error(
      `Message analysis failed for ${messageId} (tenant ${tenantId}):`,
      error,
    )
  }
}

function detectCasework(text: string): boolean {
  const haystack = text.toLowerCase()
  const keywords = [
    "casework",
    "help",
    "assistance",
    "status",
    "issue",
    "problem",
    "passport",
    "benefits",
    "medicare",
    "social security",
    "irs",
    "unemployment",
    "urgent",
    "deadline",
  ]
  return keywords.some((word) => haystack.includes(word))
}

function extractBodyText(payload: {
  body?: { data?: string }
  parts?: any[]
} | undefined): string | null {
  if (!payload) return null

  const decode = (part: { body?: { data?: string } } | undefined) => {
    if (!part?.body?.data) return null
    try {
      return Buffer.from(part.body.data, "base64").toString("utf8")
    } catch {
      return null
    }
  }

  const direct = decode(payload)
  if (direct) return direct

  if (payload.parts?.length) {
    for (const part of payload.parts) {
      if (part?.mimeType === "text/plain") {
        const text = decode(part)
        if (text) return text
      }
    }
    for (const part of payload.parts) {
      if (part?.mimeType === "text/html") {
        const html = decode(part)
        if (html) return html.replace(/<[^>]+>/g, " ")
      }
    }
  }

  return null
}

let threadsSchemaReady = false
async function ensureThreadsSchema() {
  if (threadsSchemaReady) return
  const statements = [
    `ALTER TABLE threads ADD COLUMN IF NOT EXISTS sender_email text`,
    `ALTER TABLE threads ADD COLUMN IF NOT EXISTS topic text`,
    `ALTER TABLE threads ADD COLUMN IF NOT EXISTS summary text`,
    `ALTER TABLE threads ADD COLUMN IF NOT EXISTS snippet text`,
    `ALTER TABLE threads ADD COLUMN IF NOT EXISTS confidence numeric(4,3)`,
    `ALTER TABLE threads ADD COLUMN IF NOT EXISTS stance text`,
    `ALTER TABLE threads ADD COLUMN IF NOT EXISTS type text`,
    `ALTER TABLE threads ALTER COLUMN type SET DEFAULT 'CORRESPONDENCE'`,
    `UPDATE threads SET type = 'CORRESPONDENCE' WHERE type IS NULL`,
    `ALTER TABLE threads ALTER COLUMN type SET NOT NULL`,
    `ALTER TABLE threads ADD COLUMN IF NOT EXISTS unread boolean`,
    `ALTER TABLE threads ALTER COLUMN unread SET DEFAULT true`,
    `UPDATE threads SET unread = false WHERE unread IS NULL`,
  ]
  for (const sql of statements) {
    await query(sql).catch((error) => {
      console.error("Schema update failed:", error)
    })
  }
  threadsSchemaReady = true
}

/**
 * Fetch with exponential backoff retry on 429/5xx errors.
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 5
): Promise<Response> {
  let attempt = 0;

  while (attempt < maxRetries) {
    const response = await fetch(url, options);

    // Success
    if (response.ok) {
      return response;
    }

    // Check if retryable error
    const isRetryable =
      response.status === 429 || response.status >= 500;

    if (!isRetryable || attempt === maxRetries - 1) {
      // Not retryable or last attempt, throw error
      const errorBody = await response.text().catch(() => "");
      throw new Error(
        `Gmail API request failed with status ${response.status}: ${errorBody}`
      );
    }

    // Exponential backoff: 2^attempt * 1000ms (1s, 2s, 4s, 8s, 16s)
    const delayMs = Math.pow(2, attempt) * 1000;
    await sleep(delayMs);

    attempt++;
  }

  throw new Error(`Max retries (${maxRetries}) exceeded for ${url}`);
}

/**
 * Sleep helper for backoff delays.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

