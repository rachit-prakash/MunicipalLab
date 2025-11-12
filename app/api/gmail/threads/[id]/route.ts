import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { withTenant, query } from '@/lib/db';
import { getAccessToken } from '@/lib/googleTokens';
import { redactPII } from '@/lib/sanitizer';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // gets the session for the tenantId and userId
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id || (session as any).token?.sub;
    // from my experience, some sessions don't have an id, so we use the sub as a fallback.
    const threadId = params.id;

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
      const threadResult = await client.query(
        `SELECT id, gmail_thread_id, subject, last_message_ts
         FROM threads
         WHERE tenant_id = $1 AND gmail_thread_id = $2
         LIMIT 1`,
        [tenantId, threadId]
      );

      if (threadResult.rows.length === 0) {
        return null;
      }

      const thread = threadResult.rows[0];

      // gets the messages for this thread
      const messagesResult = await client.query(
        `SELECT id, gmail_message_id, from_email, internal_date, snippet
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

    // if the thread exists in the database, we return it. otherwise, we fetch it from Gmail.
    if (existingThread) {
      return NextResponse.json({
        thread: {
          id: existingThread.id,
          gmail_thread_id: existingThread.gmail_thread_id,
          subject: existingThread.subject,
          last_message_ts: existingThread.last_message_ts,
        },
        messages: existingThread.messages.map((msg: any) => ({
          id: msg.id,
          gmail_message_id: msg.gmail_message_id,
          from: msg.from_email,
          date: msg.internal_date,
          snippet: msg.snippet,
        })),
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

    const gmailResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=full`,
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

    const result = await withTenant(tenantId, async (client) => {
      // we upsert the thread to the database.
      // basically what upsert means is that if the thread already exists, we update it. otherwise, we insert it.

      const threadResult = await client.query(
        `INSERT INTO threads (tenant_id, gmail_thread_id, subject, last_message_ts)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (tenant_id, gmail_thread_id)
         DO UPDATE SET 
           subject = EXCLUDED.subject,
           last_message_ts = EXCLUDED.last_message_ts
         RETURNING id, gmail_thread_id, subject, last_message_ts`,
        [
          normalizedThread.tenant_id,
          normalizedThread.gmail_thread_id,
          normalizedThread.subject,
          normalizedThread.last_message_ts,
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
          RETURNING id, gmail_message_id, from_email, internal_date, snippet`,
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
function extractBody(payload: any): string {
  // we check for direct body data.
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }
  
  // we check for text/plain parts.
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
    }
    // we check for text/html parts.
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
    }
  }
  
  // if we don't find any body data, we return an empty string.
  return '';
}
