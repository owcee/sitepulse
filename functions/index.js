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

// ============================================================================
// DELAY PREDICTION SYSTEM
// Phase 4 - Linear Regression Model for Task Delay Prediction
// ============================================================================

// Load model weights
const modelWeights = require('./delay_model_weights.json');

// All task types supported by the model
const TASK_TYPES = [
  "Backfilling and compaction",
  "Beam formwork, rebar, concrete",
  "Blinding / lean concrete",
  "CHB laying",
  "Cabinets and built-in furniture",
  "Ceiling board installation",
  "Ceiling framing",
  "Chasing for electrical/plumbing",
  "Circuit breaker panel installation",
  "Clearing and grubbing",
  "Column formwork, rebar, concrete",
  "Concrete pouring",
  "Conduit and box installation",
  "Decorative finishes",
  "Demolition",
  "Door and window frame installation",
  "Door hanging",
  "Drainage pipe installation",
  "Excavation and grading",
  "Excavation for footings",
  "Final floor finish (polish, varnish, epoxy)",
  "Formwork installation",
  "Grounding",
  "Grouting and sealing",
  "Gutter and downspout installation",
  "Lighting fixture installation",
  "Painting (primer, topcoat)",
  "Partition wall installation",
  "Plastering / rendering",
  "Plumbing fixture installation",
  "Pressure testing",
  "Purlins installation",
  "Rebar cutting and bending",
  "Rebar placement",
  "Retaining wall",
  "Roof insulation",
  "Roof sheeting / panel installation",
  "Roof truss fabrication and installation",
  "Roof waterproofing / sealant",
  "Septic tank construction",
  "Setting out / layout",
  "Shelves and counters",
  "Site survey and staking",
  "Slab formwork, rebar, concrete",
  "Soil testing",
  "Staircase formwork, rebar, concrete",
  "Structural steel works",
  "Switch and outlet installation",
  "Temporary facilities",
  "Temporary fence / perimeter barricade",
  "Temporary power and water supply",
  "Testing and commissioning",
  "Tile laying (floor and wall)",
  "Vent pipe installation",
  "Wall reinforcements",
  "Water supply pipe installation",
  "Water tank installation",
  "Waterproofing (foundation level)",
  "Window glazing",
  "Wiring pulling",
  "Wood trims, baseboards, moldings"
];

/**
 * Create one-hot encoding for task type
 */
function oneHotEncodeTaskType(taskType) {
  const oneHot = {};
  const sortedTaskTypes = TASK_TYPES.slice().sort();
  
  sortedTaskTypes.forEach(type => {
    const columnName = `task_${type}`;
    oneHot[columnName] = (type === taskType) ? 1 : 0;
  });
  
  return oneHot;
}

/**
 * Calculate prediction using linear regression
 */
function predictWithLinearRegression(features) {
  const { intercept, coefficients } = modelWeights;
  let prediction = intercept;
  
  for (const [featureName, coefficient] of Object.entries(coefficients)) {
    const featureValue = features[featureName] || 0;
    prediction += featureValue * coefficient;
  }
  
  return prediction;
}

/**
 * Calculate risk level based on delay days
 */
function calculateRiskLevel(delayDays) {
  if (delayDays < 2) return "Low";
  if (delayDays < 5) return "Medium";
  return "High";
}

/**
 * Identify contributing delay factors
 */
function identifyDelayFactors(inputFeatures, delayDays = 0) {
  const factors = [];
  
  if (inputFeatures.material_shortage === 1) {
    factors.push("Material shortage");
  }
  if (inputFeatures.equipment_breakdown === 1) {
    factors.push("Equipment breakdown");
  }
  if (inputFeatures.weather_issue === 1) {
    factors.push("Weather delays");
  }
  if (inputFeatures.permit_issue === 1) {
    factors.push("Permit/approval issues");
  }
  
  // Check if progress is behind schedule
  // If there's a predicted delay, be more sensitive to progress issues
  if (inputFeatures.plannedDuration > 0) {
    const expectedProgress = (inputFeatures.daysPassed / inputFeatures.plannedDuration) * 100;
    // If there's a delay, use a tighter threshold (5% instead of 15%)
    // If no delay, use the original 15% threshold
    const threshold = delayDays > 0 ? 5 : 15;
    if (inputFeatures.progressPercent < expectedProgress - threshold) {
      factors.push("Behind schedule");
    }
    // If there's a delay but progress is ahead of expected, it might be due to other factors
    // If there's a delay and progress is slightly behind (within threshold), still flag it
    else if (delayDays > 0 && inputFeatures.progressPercent < expectedProgress) {
      factors.push("Behind schedule");
    }
  }
  
  if (factors.length === 0) {
    // Only show "On track" if there's no delay or if progress is ahead of expected
    if (delayDays <= 0) {
      factors.push("On track");
    } else {
      // If there's a delay but no obvious factors, it's likely due to model predictions
      // or subtle factors not explicitly tracked
      factors.push("Minor delays expected");
    }
  }
  
  return factors;
}

/**
 * DELAY PREDICTION: Predict delay for a single task
 */
exports.predictDelay = functions.https.onCall(async (data, context) => {
  try {
    if (!data.taskId || !data.taskType) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'taskId and taskType are required'
      );
    }

    const {
      taskId,
      taskType,
      plannedDuration,
      daysPassed,
      progressPercent,
      material_shortage = 0,
      equipment_breakdown = 0,
      weather_issue = 0,
      permit_issue = 0,
    } = data;

    if (plannedDuration <= 0 || daysPassed < 0 || progressPercent < 0 || progressPercent > 100) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Invalid numeric values provided'
      );
    }

    const numericFeatures = {
      plannedDuration,
      daysPassed,
      progressPercent,
      material_shortage: material_shortage ? 1 : 0,
      equipment_breakdown: equipment_breakdown ? 1 : 0,
      weather_issue: weather_issue ? 1 : 0,
      permit_issue: permit_issue ? 1 : 0,
    };

    const oneHotFeatures = oneHotEncodeTaskType(taskType);
    const allFeatures = { ...numericFeatures, ...oneHotFeatures };

    const predictedDuration = predictWithLinearRegression(allFeatures);
    const finalPrediction = Math.max(predictedDuration, plannedDuration);
    const roundedPrediction = Math.round(finalPrediction * 10) / 10;
    const delayDays = Math.max(0, roundedPrediction - plannedDuration);
    const riskLevel = calculateRiskLevel(delayDays);
    const factors = identifyDelayFactors(numericFeatures, delayDays);

    const result = {
      taskId,
      predictedDuration: roundedPrediction,
      delayDays: Math.round(delayDays * 10) / 10,
      riskLevel,
      factors,
      timestamp: new Date().toISOString(),
    };

    console.log('[Delay Prediction]', result);

    // Save to Firestore for analytics
    await db.collection('delayPredictions').add({
      ...result,
      inputFeatures: data,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return result;

  } catch (error) {
    console.error('[Delay Prediction Error]', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      'internal',
      'Failed to predict delay: ' + error.message
    );
  }
});

/**
 * SUBMIT DAILY SURVEY: Process survey and update delay predictions
 */
exports.submitDailySurvey = functions.https.onCall(async (data, context) => {
  try {
    const { projectId, siteStatus, siteClosedReason, taskUpdates, engineerName, date } = data;

    if (!projectId || !siteStatus) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing survey data');
    }

    // Save survey record
    await db.collection('site_surveys').add({
      projectId,
      siteStatus,
      siteClosedReason: siteClosedReason || null,
      taskUpdates: taskUpdates || {},
      engineerName: engineerName || 'Unknown',
      date: date || new Date().toISOString(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Fetch all active tasks for the project
    const tasksSnapshot = await db
      .collection('tasks')
      .where('projectId', '==', projectId)
      .where('status', 'in', ['not_started', 'in_progress'])
      .get();

    if (tasksSnapshot.empty) {
      return { message: 'No active tasks to update', updatesProcessed: 0 };
    }

    const updates = [];

    for (const taskDoc of tasksSnapshot.docs) {
      const task = taskDoc.data();
      const taskId = taskDoc.id;
      
      let weather_issue = 0;
      let material_shortage = 0;
      let equipment_breakdown = 0;
      let permit_issue = 0;
      
      // Site closed - global issues
      if (siteStatus === 'closed') {
        if (siteClosedReason === 'Weather Disruption') weather_issue = 1;
        if (siteClosedReason === 'Material Delivery Failure') material_shortage = 1;
        if (siteClosedReason === 'Permit/Inspection Issue') permit_issue = 1;
        if (siteClosedReason === 'Safety Hazard') permit_issue = 1;
      } 
      // Specific task delays
      else if (siteStatus === 'delayed') {
        const update = taskUpdates && taskUpdates[taskId];
        if (update && update.status === 'non_productive') {
          const reason = update.delayReason;
          
          if (reason === 'Bad Weather') weather_issue = 1;
          if (reason === 'Material Delay') material_shortage = 1;
          if (reason === 'Permit Issue') permit_issue = 1;
          if (reason === 'Equipment Breakdown') equipment_breakdown = 1;
          if (reason === 'Safety/Hazard') permit_issue = 1;
          if (reason === 'Manpower Shortage') material_shortage = 1; // Map to resource issue
        }
      }

      // Calculate days passed & planned duration
      let daysPassed = 0;
      let plannedDuration = 1;
      
      try {
        const startDate = task.planned_start_date ? new Date(task.planned_start_date) : new Date();
        const endDate = task.planned_end_date ? new Date(task.planned_end_date) : new Date();
        daysPassed = Math.max(0, Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
        plannedDuration = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      } catch (e) {
        console.warn('Date parsing error for task', taskId, e);
      }

      const numericFeatures = {
        plannedDuration,
        daysPassed,
        progressPercent: task.progressPercent || 0,
        material_shortage,
        equipment_breakdown,
        weather_issue,
        permit_issue
      };

      // Find matching task type for the model
      let taskTypeForModel = task.title || task.subTask || '';
      
      // Try to match to known task types
      const matchedType = TASK_TYPES.find(t => 
        t.toLowerCase().includes(taskTypeForModel.toLowerCase()) ||
        taskTypeForModel.toLowerCase().includes(t.toLowerCase())
      );
      
      if (matchedType) {
        taskTypeForModel = matchedType;
      }

      const oneHotFeatures = oneHotEncodeTaskType(taskTypeForModel);
      const allFeatures = { ...numericFeatures, ...oneHotFeatures };

      const predictedDuration = predictWithLinearRegression(allFeatures);
      const finalPrediction = Math.max(predictedDuration, plannedDuration);
      const delayDays = Math.max(0, finalPrediction - plannedDuration);
      const riskLevel = calculateRiskLevel(delayDays);

      updates.push({
        taskId,
        delayDays: Math.round(delayDays * 10) / 10,
        riskLevel,
        predictedDuration: Math.round(finalPrediction * 10) / 10,
        lastSurveyUpdate: new Date().toISOString()
      });
      
      // Update the task document with prediction info
      await taskDoc.ref.update({
        predictedDelay: Math.round(delayDays * 10) / 10,
        riskLevel,
        hasMaterialShortage: material_shortage === 1,
        hasWeatherIssue: weather_issue === 1,
        hasEquipmentBreakdown: equipment_breakdown === 1,
        hasPermitIssue: permit_issue === 1,
        lastPredictionUpdate: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    return { success: true, updatesProcessed: updates.length, updates };

  } catch (error) {
    console.error('[Survey Processing Error]', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * PREDICT ALL DELAYS: Batch predict for all active tasks in a project
 */
exports.predictAllDelays = functions.https.onCall(async (data, context) => {
  try {
    const { projectId } = data;

    if (!projectId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'projectId is required'
      );
    }

    // Fetch all active tasks for the project
    const tasksSnapshot = await db
      .collection('tasks')
      .where('projectId', '==', projectId)
      .where('status', 'in', ['not_started', 'in_progress'])
      .get();

    if (tasksSnapshot.empty) {
      return {
        projectId,
        predictions: [],
        message: 'No active tasks found',
        totalTasks: 0,
        highRiskCount: 0,
        mediumRiskCount: 0,
        lowRiskCount: 0,
      };
    }

    const predictions = [];
    
    for (const taskDoc of tasksSnapshot.docs) {
      const task = taskDoc.data();
      
      // Calculate days passed
      let daysPassed = 0;
      let plannedDuration = 1;
      
      try {
        const startDate = task.planned_start_date ? new Date(task.planned_start_date) : new Date();
        const endDate = task.planned_end_date ? new Date(task.planned_end_date) : new Date();
        daysPassed = Math.max(0, Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
        plannedDuration = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      } catch (e) {
        console.warn('Date parsing error for task', taskDoc.id, e);
      }
      
      // Find matching task type
      let taskTypeForModel = task.title || task.subTask || '';
      const matchedType = TASK_TYPES.find(t => 
        t.toLowerCase().includes(taskTypeForModel.toLowerCase()) ||
        taskTypeForModel.toLowerCase().includes(t.toLowerCase())
      );
      if (matchedType) taskTypeForModel = matchedType;
      
      const numericFeatures = {
        plannedDuration,
        daysPassed,
        progressPercent: task.progressPercent || 0,
        material_shortage: task.hasMaterialShortage ? 1 : 0,
        equipment_breakdown: task.hasEquipmentBreakdown ? 1 : 0,
        weather_issue: task.hasWeatherIssue ? 1 : 0,
        permit_issue: task.hasPermitIssue ? 1 : 0,
      };
      
      const oneHotFeatures = oneHotEncodeTaskType(taskTypeForModel);
      const allFeatures = { ...numericFeatures, ...oneHotFeatures };
      
      const predictedDuration = Math.max(
        predictWithLinearRegression(allFeatures),
        plannedDuration
      );
      
      const delayDays = Math.max(0, predictedDuration - plannedDuration);
      const riskLevel = calculateRiskLevel(delayDays);
      const factors = identifyDelayFactors(numericFeatures, delayDays);
      
      predictions.push({
        taskId: taskDoc.id,
        taskTitle: task.title,
        taskType: task.subTask || task.category,
        status: task.status,
        plannedDuration,
        predictedDuration: Math.round(predictedDuration * 10) / 10,
        delayDays: Math.round(delayDays * 10) / 10,
        riskLevel,
        factors,
        plannedEndDate: task.planned_end_date,
      });
    }

    // Sort by risk level (High → Medium → Low)
    const riskOrder = { High: 3, Medium: 2, Low: 1 };
    predictions.sort((a, b) => riskOrder[b.riskLevel] - riskOrder[a.riskLevel]);

    return {
      projectId,
      predictions,
      totalTasks: predictions.length,
      highRiskCount: predictions.filter(p => p.riskLevel === 'High').length,
      mediumRiskCount: predictions.filter(p => p.riskLevel === 'Medium').length,
      lowRiskCount: predictions.filter(p => p.riskLevel === 'Low').length,
      timestamp: new Date().toISOString(),
    };

  } catch (error) {
    console.error('[Batch Prediction Error]', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to predict delays: ' + error.message
    );
  }
});

/**
 * SCHEDULED DELAY PREDICTION: Daily automatic predictions (6 AM Manila time)
 */
exports.scheduledDelayPrediction = functions.pubsub
  .schedule('0 6 * * *')
  .timeZone('Asia/Manila')
  .onRun(async (context) => {
    try {
      console.log('[Scheduled Prediction] Starting daily prediction run...');

      // Fetch all active projects
      const projectsSnapshot = await db
        .collection('projects')
        .where('status', '==', 'active')
        .get();

      if (projectsSnapshot.empty) {
        console.log('[Scheduled Prediction] No active projects found');
        return null;
      }

      let totalPredictions = 0;
      let highRiskTasks = 0;

      for (const projectDoc of projectsSnapshot.docs) {
        const projectId = projectDoc.id;
        
        // Get active tasks for this project
        const tasksSnapshot = await db
          .collection('tasks')
          .where('projectId', '==', projectId)
          .where('status', 'in', ['not_started', 'in_progress'])
          .get();

        for (const taskDoc of tasksSnapshot.docs) {
          const task = taskDoc.data();
          
          let daysPassed = 0;
          let plannedDuration = 1;
          
          try {
            const startDate = task.planned_start_date ? new Date(task.planned_start_date) : new Date();
            const endDate = task.planned_end_date ? new Date(task.planned_end_date) : new Date();
            daysPassed = Math.max(0, Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
            plannedDuration = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
          } catch (e) {
            console.warn('Date parsing error', e);
          }

          let taskTypeForModel = task.title || task.subTask || '';
          const matchedType = TASK_TYPES.find(t => 
            t.toLowerCase().includes(taskTypeForModel.toLowerCase()) ||
            taskTypeForModel.toLowerCase().includes(t.toLowerCase())
          );
          if (matchedType) taskTypeForModel = matchedType;

          const numericFeatures = {
            plannedDuration,
            daysPassed,
            progressPercent: task.progressPercent || 0,
            material_shortage: task.hasMaterialShortage ? 1 : 0,
            equipment_breakdown: task.hasEquipmentBreakdown ? 1 : 0,
            weather_issue: task.hasWeatherIssue ? 1 : 0,
            permit_issue: task.hasPermitIssue ? 1 : 0,
          };

          const oneHotFeatures = oneHotEncodeTaskType(taskTypeForModel);
          const allFeatures = { ...numericFeatures, ...oneHotFeatures };

          const predictedDuration = Math.max(predictWithLinearRegression(allFeatures), plannedDuration);
          const delayDays = Math.max(0, predictedDuration - plannedDuration);
          const riskLevel = calculateRiskLevel(delayDays);

          // Update task with latest prediction
          await taskDoc.ref.update({
            predictedDelay: Math.round(delayDays * 10) / 10,
            riskLevel,
            lastPredictionUpdate: admin.firestore.FieldValue.serverTimestamp()
          });

          totalPredictions++;
          if (riskLevel === 'High') highRiskTasks++;
        }

        // Send notification if high-risk tasks exist
        if (highRiskTasks > 0) {
          const projectData = projectDoc.data();
          const engineerId = projectData.engineerId;
          
          if (engineerId) {
            await db.collection('notifications').add({
              userId: engineerId,
              type: 'high_risk_delay',
              title: '⚠️ High Risk Tasks Detected',
              body: `${highRiskTasks} task(s) are at high risk of delay in your project`,
              projectId,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              read: false,
            });
          }
        }
      }

      console.log(`[Scheduled Prediction] Complete: ${totalPredictions} predictions, ${highRiskTasks} high-risk`);
      return null;

    } catch (error) {
      console.error('[Scheduled Prediction Error]', error);
      return null;
    }
  });











