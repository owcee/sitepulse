/**
 * Seed Users Script for SitePulse
 * 
 * This script creates test users for development:
 * 1. One engineer account
 * 2. One worker account
 * 
 * Usage:
 *   node scripts/seedUsers.js
 * 
 * Or use the Firebase Console to manually create users with these credentials.
 */

const users = [
  {
    email: 'engineer@sitepulse.com',
    password: 'engineer123',
    userData: {
      name: 'John Engineer',
      role: 'engineer',
      projectId: null, // Engineers manage all projects
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  },
  {
    email: 'worker@gmail.com',
    password: 'worker123',
    userData: {
      name: 'lemuel worker',
      role: 'worker',
      projectId: null, // Workers start unassigned
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }
];

console.log('\n========================================');
console.log('🔧 SitePulse User Seeding Information');
console.log('========================================\n');
console.log('⚠️  This script provides instructions for manual user creation.');
console.log('    Firebase Admin SDK requires server environment with service account.\n');

console.log('📝 MANUAL STEPS TO CREATE USERS:\n');
console.log('1. Open Firebase Console: https://console.firebase.google.com/project/sitepulse-2d882/authentication/users');
console.log('2. Click "Add user" for each account below');
console.log('3. After creating the Auth user, go to Firestore Database');
console.log('4. Navigate to the "users" collection');
console.log('5. Create a document with the UID from step 2 and add these fields:\n');

users.forEach((user, index) => {
  console.log(`\n--- User ${index + 1}: ${user.userData.role.toUpperCase()} ---`);
  console.log(`Email:    ${user.email}`);
  console.log(`Password: ${user.password}`);
  console.log('\nFirestore Document Fields:');
  console.log(JSON.stringify(user.userData, null, 2));
  console.log('----------------------------------------');
});

console.log('\n\n📋 QUICK FIRESTORE DOCUMENT TEMPLATE:\n');
console.log('For ENGINEER:');
console.log(JSON.stringify({
  uid: '<COPY_FROM_AUTH_USER>',
  email: 'engineer@sitepulse.com',
  name: 'John Engineer',
  role: 'engineer',
  projectId: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}, null, 2));

console.log('\n\nFor WORKER:');
console.log(JSON.stringify({
  uid: '<COPY_FROM_AUTH_USER>',
  email: 'worker@gmail.com',
  name: 'lemuel worker',
  role: 'worker',
  projectId: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}, null, 2));

console.log('\n\n✅ After creating these users, you can log in with the credentials above!\n');
console.log('========================================\n');

