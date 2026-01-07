import { syncAllAccountsForUser } from './sync';

const johnDoeUserId = '414cdf7f-4386-4198-a5f5-b434d6efd1d3';

console.log('🔄 Testing sync for John Doe...');
console.log(`User ID: ${johnDoeUserId}`);

syncAllAccountsForUser(johnDoeUserId)
  .then(() => {
    console.log('✅ Sync completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Sync failed:');
    console.error(error);
    process.exit(1);
  });
