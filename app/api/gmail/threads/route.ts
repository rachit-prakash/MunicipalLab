import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { withTenant, query } from '@/lib/db';
import { audit } from '@/lib/audit';
import { checkRateLimit, RateLimits } from '@/lib/rateLimit';
import { filterMessage } from '@/lib/message-filter';

export async function GET(request: NextRequest) {
  // Check rate limit
  const rateLimitResponse = await checkRateLimit(request, RateLimits.GMAIL_THREADS)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id || (session as any).token?.sub;

    // Get tenant_id and user email for this user
    const tenantResult = await query(
      `SELECT tenant_id, email FROM gmail_accounts WHERE user_id = $1 LIMIT 1`,
      [userId]
    );

    if (!tenantResult.rows.length) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 });
    }

    const tenantId = tenantResult.rows[0].tenant_id;
    const userEmail = tenantResult.rows[0].email;

    // we parse the query parameters.
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get('q') || '';
    const status = searchParams.get('status') || '';
    const topicId = searchParams.get('topicId') || '';
    const assigneeId = searchParams.get('assigneeId') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100); // we cap the limit at 100.
    const cursor = searchParams.get('cursor') || '';
    const folder = searchParams.get('folder') || ''; // NEW: Folder filter

    // we query the threads with filters and pagination.
    const result = await withTenant(tenantId, async (client) => {
      // we build the WHERE clause with filters.
      const conditions: string[] = ['tenant_id = $1'];
      const params: any[] = [tenantId];
      let paramIndex = 2;

      // Exclude outbound threads (sent by the user)
      conditions.push(`sender_email NOT ILIKE $${paramIndex}`);
      params.push(`%${userEmail}%`);
      paramIndex++;

      // Full-text search on subject using ILIKE for case-insensitive search.
      // Note: Search on message bodies would require joining with messages table
      if (q) {
        conditions.push(`subject ILIKE $${paramIndex}`);
        params.push(`%${q}%`);
        paramIndex++;
      }

      // we filter by status.
      if (status) {
        conditions.push(`status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }

      // we filter by topic.
      if (topicId) {
        conditions.push(`topic_id = $${paramIndex}`);
        params.push(topicId);
        paramIndex++;
      }

      // we filter by assignee.
      if (assigneeId) {
        conditions.push(`assignee_id = $${paramIndex}`);
        params.push(assigneeId);
        paramIndex++;
      }

      // we use keyset pagination: cursor is the last_message_ts from previous page.
      if (cursor) {
        conditions.push(`last_message_ts < $${paramIndex}`);
        params.push(cursor);
        paramIndex++;
      }

      const whereClause = conditions.join(' AND ');

      // we query the threads with pagination (fetch limit + 1 to determine if there's a next page).
      // Join with messages to get urgency data from the most recent message
      // Check if sender_type column exists (it may not be in older schemas)
      const hasSenderType = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'threads' AND column_name = 'sender_type'
      `);
      const senderTypeSelect = hasSenderType.rows.length > 0
        ? 't.sender_type as "senderType",'
        : 'NULL as "senderType",';

      const threadsResult = await client.query(
        `SELECT
          t.id,
          COALESCE(t.subject, '(No subject)') AS subject,
          COALESCE(t.sender_email, 'Unknown sender') AS sender,
          t.last_message_ts as "receivedAt",
          t.type,
          t.topic,
          t.stance,
          COALESCE(t.summary, '(No summary yet)') AS summary,
          t.confidence,
          t.unread,
          t.last_message_ts,
          ${senderTypeSelect}
          m.urgency_level as "urgencyLevel",
          m.urgency_reasons as "urgencyReasons",
          m.sentiment_score as "sentimentScore"
         FROM threads t
         LEFT JOIN LATERAL (
           SELECT urgency_level, urgency_reasons, sentiment_score
           FROM messages
           WHERE thread_id = t.id AND is_outbound = false
           ORDER BY internal_date DESC
           LIMIT 1
         ) m ON true
         WHERE ${whereClause}
         ORDER BY t.last_message_ts DESC
         LIMIT $${paramIndex}`,
        [...params, limit + 1]
      );

      const threads = threadsResult.rows;

      // NEW: Apply folder filter if specified
      let filteredThreads = threads;
      if (folder) {
        // Import folder filtering logic (we'll do client-side filtering for now)
        // In production, you might want to move some of this to SQL for performance
        const { getThreadsInFolder } = await import('@/lib/folders');
        filteredThreads = getThreadsInFolder(threads, folder as any);
      }

      // we check if there are more results.
      const hasMore = filteredThreads.length > limit;
      const items = hasMore ? filteredThreads.slice(0, limit) : filteredThreads;

      // we generate the next cursor if there are more results.
      let nextCursor: string | undefined;
      if (hasMore) {
        const lastItem = items[items.length - 1];
        nextCursor = lastItem.last_message_ts;
      }

      // we format the response items to match the ThreadRow type.
      const formattedItems = items.map((thread) => ({
        id: thread.id,
        subject: thread.subject,
        sender: thread.sender,
        receivedAt: thread.receivedAt,
        type: thread.type,
        topic: thread.topic,
        stance: thread.stance,
        summary: thread.summary,
        confidence: thread.confidence,
        unread: thread.unread,
        senderType: thread.senderType,
        urgencyLevel: thread.urgencyLevel,
        urgencyReasons: thread.urgencyReasons,
        sentimentScore: thread.sentimentScore ? parseFloat(thread.sentimentScore) : undefined,
      }));

      return {
        items: formattedItems,
        nextCursor,
      };
    });

    // we return the threads from the database.
    // best-effort audit
    try {
      await audit({
        tenantId,
        actorUserId: userId,
        action: 'gmail.threads.list',
        requestId: request.headers.get('x-request-id') ?? undefined,
        payload: { q, status, topicId, assigneeId, limit, folder },
      })
    } catch {}
    return NextResponse.json(result);
  } catch (error) {
    // if we fail to fetch the threads, we return a 500 error.
    console.error('Error fetching threads:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

