import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { runIncrementalSync } from '@/lib/sync';

/**
 * Cron endpoint to automatically sync Gmail for all active users
 * Protected by CRON_SECRET environment variable
 *
 * Called by Vercel Cron every 15 minutes
 */
export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('CRON_SECRET not configured');
    return NextResponse.json({ error: 'Cron not configured' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    console.error('Invalid cron authorization');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('🔄 Starting automatic Gmail sync for all users...');

    // Get all active gmail accounts
    const accountsResult = await query(`
      SELECT
        ga.user_id,
        ga.tenant_id,
        ga.email,
        ga.last_sync_at
      FROM gmail_accounts ga
      WHERE ga.refresh_token IS NOT NULL
      ORDER BY ga.last_sync_at ASC NULLS FIRST
      LIMIT 50
    `);

    const accounts = accountsResult.rows;
    console.log(`Found ${accounts.length} accounts to sync`);

    const results = {
      total: accounts.length,
      synced: 0,
      failed: 0,
      errors: [] as any[]
    };

    // Sync each account
    for (const account of accounts) {
      try {
        console.log(`Syncing ${account.email}...`);
        await runIncrementalSync(account.tenant_id, account.user_id);
        results.synced++;
        console.log(`✓ Synced ${account.email}`);
      } catch (error: any) {
        console.error(`✗ Failed to sync ${account.email}:`, error);
        results.failed++;
        results.errors.push({
          email: account.email,
          error: error.message || String(error)
        });
      }
    }

    console.log('✅ Sync complete:', results);

    return NextResponse.json({
      success: true,
      ...results,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Cron sync failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error'
      },
      { status: 500 }
    );
  }
}
