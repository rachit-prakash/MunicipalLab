import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { withTenant, query } from '@/lib/db';
import { getAccessToken } from '@/lib/googleTokens';
import { audit } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id || (session as any).token?.sub;
    const userEmail = (session.user as any).email;

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
    const { to, subject, message, threadId, inReplyTo, references } = body;

    // Validate input
    if (!to || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, message' },
        { status: 400 }
      );
    }

    // Get access token
    const accessToken = await getAccessToken(tenantId, userId);
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Failed to get access token' },
        { status: 500 }
      );
    }

    // Compose email in RFC 2822 format
    const emailLines = [
      `From: ${userEmail}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 7bit',
    ];

    // Add threading headers if this is a reply
    if (inReplyTo) {
      emailLines.push(`In-Reply-To: ${inReplyTo}`);
    }
    if (references) {
      emailLines.push(`References: ${references}`);
    }

    emailLines.push('');
    emailLines.push(message);

    const email = emailLines.join('\r\n');

    // Encode to base64url
    const encodedEmail = Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send email via Gmail API
    const gmailResponse = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw: encodedEmail,
          threadId: threadId || undefined,
        }),
      }
    );

    if (!gmailResponse.ok) {
      const errorData = await gmailResponse.json();
      console.error('Gmail API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to send email', details: errorData },
        { status: gmailResponse.status }
      );
    }

    const sentMessage = await gmailResponse.json();

    // Save to database if we have a thread
    if (threadId) {
      try {
        await withTenant(tenantId, async (client) => {
          // Get internal thread ID
          const threadResult = await client.query(
            `SELECT id FROM threads WHERE tenant_id = $1 AND gmail_thread_id = $2 LIMIT 1`,
            [tenantId, threadId]
          );

          if (threadResult.rows.length > 0) {
            const internalThreadId = threadResult.rows[0].id;

            // Insert the sent message
            await client.query(
              `INSERT INTO messages (
                tenant_id, thread_id, gmail_message_id, from_email, to_email,
                internal_date, snippet, body_redacted, is_outbound
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
              ON CONFLICT (tenant_id, gmail_message_id) DO NOTHING`,
              [
                tenantId,
                internalThreadId,
                sentMessage.id,
                userEmail,
                [to],
                new Date(),
                message.substring(0, 200),
                message,
                true, // is_outbound
              ]
            );

            // Update thread's last_message_ts and mark as replied
            await client.query(
              `UPDATE threads
               SET last_message_ts = $1, is_replied = true, updated_at = NOW()
               WHERE id = $2 AND tenant_id = $3`,
              [new Date(), internalThreadId, tenantId]
            );
          }
        });
      } catch (dbError) {
        console.error('Failed to save sent message to database:', dbError);
        // Don't fail the request if database save fails
      }
    }

    // Best-effort audit
    try {
      await audit({
        tenantId,
        actorUserId: userId,
        action: 'gmail.send',
        requestId: request.headers.get('x-request-id') ?? undefined,
        payload: { to, subject, threadId },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      messageId: sentMessage.id,
      threadId: sentMessage.threadId,
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
