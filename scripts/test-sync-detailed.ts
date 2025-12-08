import { query, withTenant } from "@/lib/db";
import { getAccessToken } from "@/lib/googleTokens";

const johnDoeUserId = '414cdf7f-4386-4198-a5f5-b434d6efd1d3';
const johnDoeTenantId = '08316542-314b-4964-875f-936f834599b9';

async function testSync() {
  console.log('🔍 Checking gmail_accounts record...');

  // Check the gmail_account
  const accountInfo = await withTenant(johnDoeTenantId, async (client) => {
    const result = await client.query(
      `SELECT id, history_id, email FROM gmail_accounts WHERE user_id = $1`,
      [johnDoeUserId]
    );
    return result.rows[0];
  });

  console.log('Account info:', accountInfo);

  if (!accountInfo.history_id) {
    console.log('⚠️  No history_id - sync will do FULL sync');
  } else {
    console.log(`📋 Has history_id: ${accountInfo.history_id} - sync will do INCREMENTAL sync`);
  }

  // Get access token
  const accessToken = await getAccessToken(johnDoeTenantId, johnDoeUserId);
  console.log('✅ Got access token');

  // Try to list messages
  console.log('📬 Fetching messages from Gmail...');
  const response = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&q=',
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  const data = await response.json();
  console.log(`Found ${data.messages?.length || 0} messages`);
  if (data.messages && data.messages.length > 0) {
    console.log('First message ID:', data.messages[0].id);
  }

  console.log('\n📊 Checking messages in database...');
  const messagesResult = await query(
    'SELECT COUNT(*) as count FROM messages WHERE tenant_id = $1',
    [johnDoeTenantId]
  );
  console.log(`Messages in database: ${messagesResult.rows[0].count}`);
}

testSync()
  .then(() => {
    console.log('✅ Test complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
