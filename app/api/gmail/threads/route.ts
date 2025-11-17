import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { withTenant, query } from '@/lib/db';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id || (session as any).token?.sub;

    // Get tenant_id for this user
    const tenantResult = await query(
      `SELECT tenant_id FROM gmail_accounts WHERE user_id = $1 LIMIT 1`,
      [userId]
    );

    if (!tenantResult.rows.length) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 });
    }

    const tenantId = tenantResult.rows[0].tenant_id;

    // we parse the query parameters.
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get('q') || '';
    const status = searchParams.get('status') || '';
    const topicId = searchParams.get('topicId') || '';
    const assigneeId = searchParams.get('assigneeId') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100); // we cap the limit at 100.
    const cursor = searchParams.get('cursor') || '';

    // we query the threads with filters and pagination.
    const result = await withTenant(tenantId, async (client) => {
      // we build the WHERE clause with filters.
      const conditions: string[] = ['tenant_id = $1'];
      const params: any[] = [tenantId];
      let paramIndex = 2;

      // Full-text search on subject and snippet using ILIKE for case-insensitive search.
      if (q) {
        conditions.push(`(subject ILIKE $${paramIndex} OR snippet ILIKE $${paramIndex})`);
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
      const threadsResult = await client.query(
        `SELECT 
          id,
          subject,
          sender_email as sender,
          last_message_ts as "receivedAt",
          type,
          topic,
          stance,
          summary,
          confidence,
          unread,
          last_message_ts
         FROM threads
         WHERE ${whereClause}
         ORDER BY last_message_ts DESC
         LIMIT $${paramIndex}`,
        [...params, limit + 1]
      );

      const threads = threadsResult.rows;
      
      // we check if there are more results.
      const hasMore = threads.length > limit;
      const items = hasMore ? threads.slice(0, limit) : threads;
      
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
      }));

      return {
        items: formattedItems,
        nextCursor,
      };
    });

    // we return the threads from the database.
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

