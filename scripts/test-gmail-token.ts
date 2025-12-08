import { getAccessToken } from '@/lib/googleTokens';

const johnDoeUserId = '414cdf7f-4386-4198-a5f5-b434d6efd1d3';
const johnDoeTenantId = '08316542-314b-4964-875f-936f834599b9';

console.log('🔑 Testing Gmail access token for John Doe...');
console.log(`User ID: ${johnDoeUserId}`);
console.log(`Tenant ID: ${johnDoeTenantId}`);

getAccessToken(johnDoeTenantId, johnDoeUserId)
  .then((token) => {
    console.log('✅ Got access token!');
    console.log(`Token: ${token.substring(0, 20)}...`);

    // Try to fetch Gmail profile
    return fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  })
  .then(res => res.json())
  .then((profile) => {
    console.log('✅ Gmail profile:');
    console.log(profile);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed to get access token or profile:');
    console.error(error);
    process.exit(1);
  });
