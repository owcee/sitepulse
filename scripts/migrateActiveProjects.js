/**
 * Data Migration Script: projectId → activeProjectIds
 * Phase 3 - Multi-Project Support
 * 
 * This script migrates engineer accounts from single projectId to array-based activeProjectIds
 * 
 * Usage:
 *   node scripts/migrateActiveProjects.js --dry-run    # Preview changes
 *   node scripts/migrateActiveProjects.js --execute    # Apply changes
 */

const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json'); // You'll need to download this from Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateEngineerProjects(dryRun = true) {
  console.log(`\n🚀 Starting migration${dryRun ? ' (DRY RUN)' : ' (LIVE)'}...\n`);

  try {
    const engineersSnapshot = await db.collection('engineer_accounts').get();
    
    if (engineersSnapshot.empty) {
      console.log('No engineer accounts found.');
      return;
    }

    let migratedCount = 0;
    let skippedCount = 0;
    const batch = db.batch();

    for (const doc of engineersSnapshot.docs) {
      const data = doc.data();
      
      // Skip if already has activeProjectIds
      if (data.activeProjectIds && Array.isArray(data.activeProjectIds)) {
        console.log(`⏭️  Skipping ${doc.id} (${data.name}) - already migrated`);
        skippedCount++;
        continue;
      }

      // Prepare migration
      const updates = {
        activeProjectIds: data.projectId ? [data.projectId] : [],
        currentProjectId: data.projectId || null
        // Keep projectId for backward compatibility during transition
      };

      console.log(`✅ ${doc.id} (${data.name})`);
      console.log(`   Old: projectId = ${data.projectId || 'null'}`);
      console.log(`   New: activeProjectIds = [${updates.activeProjectIds.join(', ')}]`);
      console.log(`        currentProjectId = ${updates.currentProjectId}`);
      console.log('');

      if (!dryRun) {
        batch.update(doc.ref, updates);
      }

      migratedCount++;
    }

    if (!dryRun && migratedCount > 0) {
      await batch.commit();
      console.log(`\n✨ Successfully migrated ${migratedCount} engineer accounts!`);
    } else if (dryRun) {
      console.log(`\n📋 DRY RUN COMPLETE: ${migratedCount} accounts would be migrated.`);
    }

    console.log(`   Skipped: ${skippedCount}`);
    console.log(`   Total: ${engineersSnapshot.size}`);

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  }
}

// Parse command-line arguments
const args = process.argv.slice(2);
const isDryRun = !args.includes('--execute');

if (isDryRun) {
  console.log('⚠️  Running in DRY RUN mode. No changes will be applied.');
  console.log('   To apply changes, run: node scripts/migrateActiveProjects.js --execute\n');
}

migrateEngineerProjects(isDryRun)
  .then(() => {
    console.log('\n✅ Migration script completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed:', error);
    process.exit(1);
  });











