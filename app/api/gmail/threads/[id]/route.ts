import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { withTenant, query } from '@/lib/db';
import { getAccessToken } from '@/lib/googleTokens';
import { redactPII } from '@/lib/sanitizer';
import { audit } from '@/lib/audit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // gets the session for the tenantId and userId
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id || (session as any).token?.sub;
    // from my experience, some sessions don't have an id, so we use the sub as a fallback.
    const { id: threadId } = await params;

    // gets the tenantId for this user
    const tenantResult = await query(
      `SELECT tenant_id FROM gmail_accounts WHERE user_id = $1 LIMIT 1`,
      [userId] // for the vibe coders asking what dollar sign stands for. its a placeholder for the first value of the array that we defined below
    );

    if (!tenantResult.rows.length) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 });
    }

    const tenantId = tenantResult.rows[0].tenant_id;

    // if the thread doesnt exist in the database, we return a 404 error.
    const existingThread = await withTenant(tenantId, async (client) => {
      // Support both internal UUID and gmail_thread_id
      // Check if threadId is a UUID (has dashes) or gmail_thread_id (no dashes)
      const isUuid = threadId.includes('-');
      const whereClause = isUuid
        ? 'tenant_id = $1 AND id = $2'
        : 'tenant_id = $1 AND gmail_thread_id = $2';

      const threadResult = await client.query(
        `SELECT id, gmail_thread_id, subject, last_message_ts
         FROM threads
         WHERE ${whereClause}
         LIMIT 1`,
        [tenantId, threadId]
      );

      if (threadResult.rows.length === 0) {
        return null;
      }

      const thread = threadResult.rows[0];

      // gets the messages for this thread
      const messagesResult = await client.query(
        `SELECT id, gmail_message_id, from_email, internal_date, snippet, body_redacted, is_outbound
         FROM messages
         WHERE tenant_id = $1 AND thread_id = $2
         ORDER BY internal_date ASC`,
        [tenantId, thread.id]
      );

      return {
        ...thread,
        messages: messagesResult.rows,
      };
    });

    // Check if refresh is requested (bypasses database cache)
    const refresh = request.nextUrl.searchParams.get('refresh') === 'true';

    // if the thread exists in the database AND no refresh requested, we return it.
    if (existingThread && !refresh) {
      // best-effort audit
      try {
        await audit({
          tenantId,
          actorUserId: userId,
          action: 'gmail.thread.read',
          requestId: request.headers.get('x-request-id') ?? undefined,
          payload: { source: 'db', id: threadId },
        })
      } catch {}
      const formattedMessages = existingThread.messages.map((msg: any) => ({
        id: msg.id,
        gmail_message_id: msg.gmail_message_id,
        from: msg.from_email,
        date: msg.internal_date,
        snippet: msg.snippet,
        body: msg.body_redacted,
        isOutbound: msg.is_outbound,
      }));

      // Debug logging for Supabase messages
      if (existingThread.messages.some((m: any) => m.from_email?.toLowerCase().includes('supabase'))) {
        console.log('[DEBUG] Supabase message detected');
        const supabaseMsg = formattedMessages.find((m: any) => m.from?.toLowerCase().includes('supabase'));
        if (supabaseMsg) {
          console.log(`[DEBUG] Body length: ${supabaseMsg.body?.length || 0} chars`);
          console.log(`[DEBUG] Snippet length: ${supabaseMsg.snippet?.length || 0} chars`);
          console.log(`[DEBUG] Body preview: ${supabaseMsg.body?.substring(0, 100)}...`);
        }
      }

      return NextResponse.json({
        thread: {
          id: existingThread.id,
          gmail_thread_id: existingThread.gmail_thread_id,
          subject: existingThread.subject,
          last_message_ts: existingThread.last_message_ts,
        },
        messages: formattedMessages,
      });
    }

    // if the thread doesnt exist in the database, we fetch it from Gmail. if we fail to get the access token, we return a 500 error.
    const accessToken = await getAccessToken(tenantId, userId);
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Failed to get access token' },
        { status: 500 }
      );
    }

    // If we got here with a UUID, we need to fetch the gmail_thread_id first
    const isUuid = threadId.includes('-');
    let gmailThreadId = threadId;

    if (isUuid && existingThread) {
      gmailThreadId = existingThread.thread.gmail_thread_id;
    } else if (isUuid && !existingThread) {
      // UUID but not in DB - can't fetch from Gmail
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    const gmailResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/threads/${gmailThreadId}?format=full`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    // if the thread is not found, we return a 404 error.
    if (gmailResponse.status === 404) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    // if we fail to fetch the thread from Gmail, we return a 500 error.
    if (!gmailResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch thread from Gmail' },
        { status: gmailResponse.status }
      );
    }

    // we get the thread from Gmail.
    const gmailThread = await gmailResponse.json();

    // we normalize the thread data.
    const subject = extractSubject(gmailThread.messages);
    const lastMessageTs = extractLastMessageTimestamp(gmailThread.messages);

    const normalizedThread = {
      tenant_id: tenantId,
      gmail_thread_id: gmailThread.id,
      subject,
      last_message_ts: lastMessageTs,
    };

    // we normalize the messages data.
    const normalizedMessages = gmailThread.messages.map((msg: any) => {
      const headers = msg.payload.headers;
      const fromHeader = headers.find((h: any) => h.name.toLowerCase() === 'from');
      const toHeader = headers.find((h: any) => h.name.toLowerCase() === 'to');
      const body = extractBody(msg.payload);

      return {
        tenant_id: tenantId,
        gmail_message_id: msg.id,
        from_email: fromHeader?.value || '',
        to_email: toHeader?.value ? toHeader.value.split(',').map((e: string) => e.trim()) : [],
        internal_date: new Date(parseInt(msg.internalDate)),
        snippet: msg.snippet || '',
        body_redacted: redactPII(body),
        is_outbound: false,
      };
    });

    // Extract sender_email from the first message (thread initiator)
    const senderEmail = normalizedMessages[0]?.from_email || null;

    const result = await withTenant(tenantId, async (client) => {
      // we upsert the thread to the database.
      // basically what upsert means is that if the thread already exists, we update it. otherwise, we insert it.

      const threadResult = await client.query(
        `INSERT INTO threads (tenant_id, gmail_thread_id, subject, last_message_ts, sender_email)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (tenant_id, gmail_thread_id)
         DO UPDATE SET
           subject = EXCLUDED.subject,
           last_message_ts = EXCLUDED.last_message_ts,
           sender_email = COALESCE(EXCLUDED.sender_email, threads.sender_email)
         RETURNING id, gmail_thread_id, subject, last_message_ts`,
        [
          normalizedThread.tenant_id,
          normalizedThread.gmail_thread_id,
          normalizedThread.subject,
          normalizedThread.last_message_ts,
          senderEmail,
        ]
      );

      const thread = threadResult.rows[0];

      // we upsert the messages to the database.
      const messages = [];
      for (const msgData of normalizedMessages) {
        const msgResult = await client.query(
          `INSERT INTO messages (
            tenant_id, thread_id, gmail_message_id, from_email, to_email,
            internal_date, snippet, body_redacted, is_outbound
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (tenant_id, gmail_message_id)
          DO UPDATE SET
            from_email = EXCLUDED.from_email,
            to_email = EXCLUDED.to_email,
            internal_date = EXCLUDED.internal_date,
            snippet = EXCLUDED.snippet,
            body_redacted = EXCLUDED.body_redacted
          RETURNING id, gmail_message_id, from_email, internal_date, snippet, body_redacted, is_outbound`,
          [
            tenantId,
            thread.id,
            msgData.gmail_message_id,
            msgData.from_email,
            msgData.to_email,
            msgData.internal_date,
            msgData.snippet,
            msgData.body_redacted,
            msgData.is_outbound,
          ]
        );
        messages.push(msgResult.rows[0]);
      }

      return { thread, messages };
    });

    // we return the thread and messages from the database.
    // best-effort audit
    try {
      await audit({
        tenantId,
        actorUserId: userId,
        action: 'gmail.thread.read',
        requestId: request.headers.get('x-request-id') ?? undefined,
        payload: { source: 'gmail', id: threadId, messages: result.messages.length },
      })
    } catch {}
    return NextResponse.json({
      thread: {
        id: result.thread.id,
        gmail_thread_id: result.thread.gmail_thread_id,
        subject: result.thread.subject,
        last_message_ts: result.thread.last_message_ts,
      },
      messages: result.messages.map((msg) => ({
        id: msg.id,
        gmail_message_id: msg.gmail_message_id,
        from: msg.from_email,
        date: msg.internal_date,
        snippet: msg.snippet,
        body: msg.body_redacted,
        isOutbound: msg.is_outbound,
      })),
    });
  } catch (error) {
    console.error('Error fetching thread:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id || (session as any).token?.sub;
    const { id: threadId } = await params;

    // Get tenant_id for this user
    const tenantResult = await query(
      `SELECT tenant_id FROM gmail_accounts WHERE user_id = $1 LIMIT 1`,
      [userId]
    );

    if (!tenantResult.rows.length) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 });
    }

    const tenantId = tenantResult.rows[0].tenant_id;

    // Parse request body
    const body = await request.json();
    const { isReplied } = body;

    // Validate input
    if (typeof isReplied !== 'boolean') {
      return NextResponse.json(
        { error: 'isReplied must be a boolean' },
        { status: 400 }
      );
    }

    // Update the thread
    const result = await withTenant(tenantId, async (client) => {
      // Support both internal UUID and gmail_thread_id
      const isUuid = threadId.includes('-');
      const whereClause = isUuid
        ? 'tenant_id = $1 AND id = $2'
        : 'tenant_id = $1 AND gmail_thread_id = $2';

      const updateResult = await client.query(
        `UPDATE threads
         SET is_replied = $3, updated_at = NOW()
         WHERE ${whereClause}
         RETURNING id, gmail_thread_id, subject, is_replied`,
        [tenantId, threadId, isReplied]
      );

      if (updateResult.rows.length === 0) {
        return null;
      }

      return updateResult.rows[0];
    });

    if (!result) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    // Best-effort audit
    try {
      await audit({
        tenantId,
        actorUserId: userId,
        action: 'gmail.thread.update',
        requestId: request.headers.get('x-request-id') ?? undefined,
        payload: { id: threadId, isReplied },
      });
    } catch {}

    return NextResponse.json({
      id: result.id,
      gmail_thread_id: result.gmail_thread_id,
      subject: result.subject,
      isReplied: result.is_replied,
    });
  } catch (error) {
    console.error('Error updating thread:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// we extract the subject from the first message headers.
function extractSubject(messages: any[]): string {
  if (!messages || messages.length === 0) return '';
  const headers = messages[0].payload.headers;
  const subjectHeader = headers.find((h: any) => h.name.toLowerCase() === 'subject');
  return subjectHeader?.value || '';
}

// we extract the timestamp from the last message.
function extractLastMessageTimestamp(messages: any[]): Date {
  if (!messages || messages.length === 0) return new Date();
  const lastMessage = messages[messages.length - 1];
  return new Date(parseInt(lastMessage.internalDate));
}

// we extract the email body from the Gmail payload.
// Gmail messages can have deeply nested multipart structures with multiple text parts.
// We need to find the ACTUAL message body, not a preview/snippet.
function extractBody(payload: any): string {
  // Simple message with direct body
  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  if (!payload.parts) {
    return '';
  }

  // Strategy: The real message body is typically inside multipart/alternative.
  // Some emails have a short preview text/plain BEFORE the multipart/alternative container.
  // We need to prioritize content from multipart/alternative and pick the largest part.

  // Step 1: Look for multipart/alternative (contains the actual message body)
  const alternativePart = findPartByMimeType(payload.parts, 'multipart/alternative');
  if (alternativePart?.parts) {
    // Prefer HTML from alternative (usually more complete), fallback to plain
    const htmlFromAlt = getLargestTextPart(alternativePart.parts, 'text/html');
    if (htmlFromAlt) return htmlFromAlt;

    const plainFromAlt = getLargestTextPart(alternativePart.parts, 'text/plain');
    if (plainFromAlt) return plainFromAlt;
  }

  // Step 2: Check multipart/related (often wraps multipart/alternative with inline images)
  const relatedPart = findPartByMimeType(payload.parts, 'multipart/related');
  if (relatedPart?.parts) {
    const altInRelated = findPartByMimeType(relatedPart.parts, 'multipart/alternative');
    if (altInRelated?.parts) {
      const htmlFromAlt = getLargestTextPart(altInRelated.parts, 'text/html');
      if (htmlFromAlt) return htmlFromAlt;

      const plainFromAlt = getLargestTextPart(altInRelated.parts, 'text/plain');
      if (plainFromAlt) return plainFromAlt;
    }

    // Direct text parts in related
    const htmlFromRelated = getLargestTextPart(relatedPart.parts, 'text/html');
    if (htmlFromRelated) return htmlFromRelated;

    const plainFromRelated = getLargestTextPart(relatedPart.parts, 'text/plain');
    if (plainFromRelated) return plainFromRelated;
  }

  // Step 3: Fallback - collect ALL text parts recursively and return the largest
  // This handles edge cases and non-standard structures
  const allHtmlParts = collectAllParts(payload.parts, 'text/html');
  if (allHtmlParts.length > 0) {
    const largest = allHtmlParts.sort((a, b) => (b.body?.size || 0) - (a.body?.size || 0))[0];
    if (largest.body?.data) return decodeBase64Url(largest.body.data);
  }

  const allPlainParts = collectAllParts(payload.parts, 'text/plain');
  if (allPlainParts.length > 0) {
    const largest = allPlainParts.sort((a, b) => (b.body?.size || 0) - (a.body?.size || 0))[0];
    if (largest.body?.data) return decodeBase64Url(largest.body.data);
  }

  return '';
}

// Gmail uses base64url encoding (RFC 4648), not standard base64
function decodeBase64Url(data: string): string {
  // Convert base64url to standard base64
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}

// Find a part by its MIME type (returns the part object, not decoded content)
function findPartByMimeType(parts: any[], mimeType: string): any | null {
  for (const part of parts) {
    if (part.mimeType === mimeType) {
      return part;
    }
    if (part.parts) {
      const found = findPartByMimeType(part.parts, mimeType);
      if (found) return found;
    }
  }
  return null;
}

// Get the largest text part of a specific type from a parts array (non-recursive)
function getLargestTextPart(parts: any[], mimeType: string): string | null {
  const matching = parts.filter(p => p.mimeType === mimeType && p.body?.data);
  if (matching.length === 0) return null;

  // Sort by size descending and return the largest
  const largest = matching.sort((a, b) => (b.body?.size || 0) - (a.body?.size || 0))[0];
  return decodeBase64Url(largest.body.data);
}

// Recursively collect ALL parts of a specific MIME type
function collectAllParts(parts: any[], mimeType: string): any[] {
  let results: any[] = [];
  for (const part of parts) {
    if (part.mimeType === mimeType && part.body?.data) {
      results.push(part);
    }
    if (part.parts) {
      results = results.concat(collectAllParts(part.parts, mimeType));
    }
  }
  return results;
}
