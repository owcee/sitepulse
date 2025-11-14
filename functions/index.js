/**
 * Cloud Functions for SitePulse
 * Phase 3 - Cascading Deletes & Push Notifications
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();
const storage = admin.storage();

/**
 * CASCADE DELETE: When a project is deleted, soft-delete all related data
 * Collections affected: materials, equipment, workers, budget_logs, 
 * task_photos, usage_submissions, notifications
 * Storage folders: task_photos/{projectId}, usage_photos/{projectId}
 */
exports.onProjectDelete = functions.firestore
  .document('projects/{projectId}')
  .onDelete(async (snap, context) => {
    const projectId = context.params.projectId;
    const deletedBy = snap.data().engineerId;
    const timestamp = admin.firestore.FieldValue.serverTimestamp();

    console.log(`Starting cascading soft-delete for project: ${projectId}`);

    try {
      // Collections to soft-delete
      const collections = [
        'materials',
        'equipment',
        'workers',
        'budget_logs',
        'task_photos',
        'usage_submissions'
      ];

      // Soft-delete documents in each collection
      const deletePromises = collections.map(async (collectionName) => {
        const snapshot = await db.collection(collectionName)
          .where('projectId', '==', projectId)
          .get();

        const batch = db.batch();
        let count = 0;

        snapshot.forEach((doc) => {
          batch.update(doc.ref, {
            deleted: true,
            deletedAt: timestamp,
            deletedBy: deletedBy
          });
          count++;
        });

        if (count > 0) {
          await batch.commit();
          console.log(`Soft-deleted ${count} documents from ${collectionName}`);
        }

        return count;
      });

      // Soft-delete project-specific notifications
      const notificationsSnapshot = await db.collection('notifications')
        .where('projectId', '==', projectId)
        .get();

      if (!notificationsSnapshot.empty) {
        const notifBatch = db.batch();
        notificationsSnapshot.forEach((doc) => {
          notifBatch.update(doc.ref, {
            deleted: true,
            deletedAt: timestamp,
            deletedBy: deletedBy
          });
        });
        await notifBatch.commit();
        console.log(`Soft-deleted ${notificationsSnapshot.size} notifications`);
      }

      // Mark worker assignments as removed
      const assignmentsSnapshot = await db.collection('worker_assignments')
        .where('projectId', '==', projectId)
        .get();

      if (!assignmentsSnapshot.empty) {
        const assignBatch = db.batch();
        assignmentsSnapshot.forEach((doc) => {
          assignBatch.update(doc.ref, {
            status: 'removed',
            decidedAt: timestamp
          });
        });
        await assignBatch.commit();
        console.log(`Removed ${assignmentsSnapshot.size} worker assignments`);
      }

      // Clear projectId from worker accounts
      const workerAccountsSnapshot = await db.collection('worker_accounts')
        .where('projectId', '==', projectId)
        .get();

      if (!workerAccountsSnapshot.empty) {
        const workerBatch = db.batch();
        workerAccountsSnapshot.forEach((doc) => {
          workerBatch.update(doc.ref, {
            projectId: null,
            removedAt: timestamp
          });
        });
        await workerBatch.commit();
        console.log(`Cleared project from ${workerAccountsSnapshot.size} worker accounts`);
      }

      // Wait for all collection deletes
      const results = await Promise.all(deletePromises);
      const totalDeleted = results.reduce((sum, count) => sum + count, 0);

      console.log(`Successfully soft-deleted ${totalDeleted} total documents for project ${projectId}`);

      // Optional: Delete Storage folders (commented out by default for safety)
      // Uncomment if you want to permanently delete photos
      /*
      try {
        const bucket = storage.bucket();
        await bucket.deleteFiles({
          prefix: `task_photos/${projectId}/`
        });
        await bucket.deleteFiles({
          prefix: `usage_photos/${projectId}/`
        });
        console.log(`Deleted storage folders for project ${projectId}`);
      } catch (storageError) {
        console.error('Error deleting storage folders:', storageError);
      }
      */

      return { success: true, deletedCount: totalDeleted };
    } catch (error) {
      console.error(`Error in cascade delete for project ${projectId}:`, error);
      throw error;
    }
  });

/**
 * Push Notification: Send FCM when a new in-app notification is created
 * Phase 3 - FCM Integration
 */
exports.onNotificationCreate = functions.firestore
  .document('notifications/{notificationId}')
  .onCreate(async (snap, context) => {
    const notification = snap.data();
    const userId = notification.userId;

    // Get user's FCM token
    try {
      const userDoc = await db.collection('engineer_accounts').doc(userId).get()
        .catch(() => db.collection('worker_accounts').doc(userId).get());

      if (!userDoc.exists) {
        console.log(`User ${userId} not found, skipping push notification`);
        return null;
      }

      const fcmToken = userDoc.data().fcmToken;
      if (!fcmToken) {
        console.log(`No FCM token for user ${userId}, skipping push notification`);
        return null;
      }

      // Send push notification
      const message = {
        notification: {
          title: notification.title,
          body: notification.body
        },
        data: {
          type: notification.type,
          notificationId: context.params.notificationId,
          projectId: notification.projectId || '',
          relatedId: notification.relatedId || ''
        },
        token: fcmToken
      };

      const response = await admin.messaging().send(message);
      console.log(`Successfully sent push notification to ${userId}:`, response);

      return response;
    } catch (error) {
      console.error(`Error sending push notification to ${userId}:`, error);
      return null;
    }
  });

/**
 * Helper: Batch delete documents
 * @param {FirebaseFirestore.Query} query - Firestore query
 * @param {number} batchSize - Number of docs to delete per batch
 */
async function deleteQueryBatch(query, batchSize = 500) {
  const snapshot = await query.limit(batchSize).get();

  if (snapshot.empty) {
    return 0;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  
  // Recurse if there might be more documents
  if (snapshot.size >= batchSize) {
    return batchSize + await deleteQueryBatch(query, batchSize);
  }

  return snapshot.size;
}




