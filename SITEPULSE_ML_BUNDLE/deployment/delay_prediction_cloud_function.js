/**
 * SITEPULSE - Delay Prediction Cloud Function
 * 
 * Firebase Cloud Function for predicting construction task delays
 * using linear regression model weights.
 * 
 * Model: delay_model_weights.json
 * Framework: Firebase Cloud Functions (Node.js)
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// ============================================================================
// Load Model Weights
// ============================================================================

// Import the delay model weights
// Place delay_model_weights.json in the functions/ directory
const modelWeights = require('./delay_model_weights.json');

// ============================================================================
// Task Type Mappings
// ============================================================================

// All 75+ task types in SITEPULSE (must match training data)
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

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create one-hot encoding for task type
 * @param {string} taskType - The task type name
 * @returns {Object} One-hot encoded features (task_xxx: 1 or 0)
 */
function oneHotEncodeTaskType(taskType) {
  const oneHot = {};
  
  // Create all task columns (sorted alphabetically like in training)
  const sortedTaskTypes = TASK_TYPES.slice().sort();
  
  sortedTaskTypes.forEach(type => {
    const columnName = `task_${type}`;
    oneHot[columnName] = (type === taskType) ? 1 : 0;
  });
  
  return oneHot;
}

/**
 * Calculate prediction using linear regression
 * @param {Object} features - Feature dictionary
 * @returns {number} Predicted duration in days
 */
function predictWithLinearRegression(features) {
  const { intercept, coefficients } = modelWeights;
  
  // Start with intercept
  let prediction = intercept;
  
  // Add each feature × coefficient
  for (const [featureName, coefficient] of Object.entries(coefficients)) {
    const featureValue = features[featureName] || 0;
    prediction += featureValue * coefficient;
  }
  
  return prediction;
}

/**
 * Calculate risk level based on delay
 * @param {number} delayDays - Number of days delayed
 * @returns {string} Risk level: "Low", "Medium", or "High"
 */
function calculateRiskLevel(delayDays) {
  if (delayDays < 2) return "Low";
  if (delayDays < 5) return "Medium";
  return "High";
}

/**
 * Identify contributing delay factors
 * @param {Object} inputFeatures - Raw input features
 * @returns {Array<string>} List of active delay factors
 */
function identifyDelayFactors(inputFeatures) {
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
  const expectedProgress = (inputFeatures.daysPassed / inputFeatures.plannedDuration) * 100;
  if (inputFeatures.progressPercent < expectedProgress - 15) {
    factors.push("Behind schedule");
  }
  
  if (factors.length === 0) {
    factors.push("On track");
  }
  
  return factors;
}

// ============================================================================
// Cloud Function: Predict Delay
// ============================================================================

/**
 * Predict task delay based on current progress and conditions
 * 
 * Request body:
 * {
 *   taskId: string,
 *   taskType: string,
 *   plannedDuration: number,
 *   daysPassed: number,
 *   progressPercent: number,
 *   material_shortage: 0 | 1,
 *   equipment_breakdown: 0 | 1,
 *   weather_issue: 0 | 1,
 *   permit_issue: 0 | 1
 * }
 * 
 * Response:
 * {
 *   taskId: string,
 *   predictedDuration: number,
 *   delayDays: number,
 *   riskLevel: "Low" | "Medium" | "High",
 *   factors: string[],
 *   timestamp: string
 * }
 */
exports.predictDelay = functions.https.onCall(async (data, context) => {
  try {
    // Validate input
    if (!data.taskId || !data.taskType) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'taskId and taskType are required'
      );
    }

    // Extract features
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

    // Validate numeric features
    if (plannedDuration <= 0 || daysPassed < 0 || progressPercent < 0 || progressPercent > 100) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Invalid numeric values provided'
      );
    }

    // Build feature vector
    const numericFeatures = {
      plannedDuration,
      daysPassed,
      progressPercent,
      material_shortage: material_shortage ? 1 : 0,
      equipment_breakdown: equipment_breakdown ? 1 : 0,
      weather_issue: weather_issue ? 1 : 0,
      permit_issue: permit_issue ? 1 : 0,
    };

    // Add one-hot encoded task type
    const oneHotFeatures = oneHotEncodeTaskType(taskType);
    const allFeatures = { ...numericFeatures, ...oneHotFeatures };

    // Make prediction
    const predictedDuration = predictWithLinearRegression(allFeatures);
    
    // Ensure prediction is at least planned duration
    const finalPrediction = Math.max(predictedDuration, plannedDuration);
    
    // Round to 1 decimal place
    const roundedPrediction = Math.round(finalPrediction * 10) / 10;
    
    // Calculate delay
    const delayDays = Math.max(0, roundedPrediction - plannedDuration);
    
    // Determine risk level
    const riskLevel = calculateRiskLevel(delayDays);
    
    // Identify contributing factors
    const factors = identifyDelayFactors(data);

    // Build response
    const result = {
      taskId,
      predictedDuration: roundedPrediction,
      delayDays: Math.round(delayDays * 10) / 10,
      riskLevel,
      factors,
      timestamp: new Date().toISOString(),
    };

    // Log prediction
    console.log('[Delay Prediction]', result);

    // Optionally save to Firestore for analytics
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

// ============================================================================
// Cloud Function: Batch Predict All Tasks
// ============================================================================

/**
 * Predict delays for all active tasks in a project
 * Useful for dashboard refresh
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
      .where('status', '!=', 'completed')
      .get();

    if (tasksSnapshot.empty) {
      return {
        projectId,
        predictions: [],
        message: 'No active tasks found',
      };
    }

    // Process each task
    const predictions = [];
    
    for (const taskDoc of tasksSnapshot.docs) {
      const task = taskDoc.data();
      
      // Calculate days passed
      const startDate = task.planned_start_date.toDate();
      const daysPassed = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Calculate planned duration
      const endDate = task.planned_end_date.toDate();
      const plannedDuration = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Build prediction input
      const predictionInput = {
        taskId: taskDoc.id,
        taskType: task.subTask,
        plannedDuration,
        daysPassed: Math.max(0, daysPassed),
        progressPercent: task.progressPercent || 0,
        material_shortage: task.material_shortage || 0,
        equipment_breakdown: task.equipment_breakdown || 0,
        weather_issue: task.weather_issue || 0,
        permit_issue: task.permit_issue || 0,
      };
      
      // Get prediction (reuse the logic)
      const numericFeatures = {
        plannedDuration: predictionInput.plannedDuration,
        daysPassed: predictionInput.daysPassed,
        progressPercent: predictionInput.progressPercent,
        material_shortage: predictionInput.material_shortage,
        equipment_breakdown: predictionInput.equipment_breakdown,
        weather_issue: predictionInput.weather_issue,
        permit_issue: predictionInput.permit_issue,
      };
      
      const oneHotFeatures = oneHotEncodeTaskType(predictionInput.taskType);
      const allFeatures = { ...numericFeatures, ...oneHotFeatures };
      
      const predictedDuration = Math.max(
        predictWithLinearRegression(allFeatures),
        predictionInput.plannedDuration
      );
      
      const delayDays = Math.max(0, predictedDuration - predictionInput.plannedDuration);
      const riskLevel = calculateRiskLevel(delayDays);
      
      predictions.push({
        taskId: taskDoc.id,
        taskTitle: task.title,
        predictedDuration: Math.round(predictedDuration * 10) / 10,
        delayDays: Math.round(delayDays * 10) / 10,
        riskLevel,
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

// ============================================================================
// Cloud Function: Scheduled Daily Prediction
// ============================================================================

/**
 * Automatically run delay predictions daily for all projects
 * Schedule: Every day at 6:00 AM (adjust as needed)
 */
exports.scheduledDelayPrediction = functions.pubsub
  .schedule('0 6 * * *')  // Cron: 6 AM every day
  .timeZone('Asia/Manila')  // Adjust to your timezone
  .onRun(async (context) => {
    try {
      console.log('[Scheduled Prediction] Starting...');

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

      // Process each project
      for (const projectDoc of projectsSnapshot.docs) {
        const projectId = projectDoc.id;
        
        // Use the batch prediction function
        const result = await exports.predictAllDelays.run({ projectId });
        
        totalPredictions += result.predictions.length;
        highRiskTasks += result.highRiskCount;
        
        // Send notifications for high-risk tasks
        if (result.highRiskCount > 0) {
          await sendHighRiskNotification(projectId, result.predictions);
        }
      }

      console.log(`[Scheduled Prediction] Complete: ${totalPredictions} predictions, ${highRiskTasks} high-risk`);
      return null;

    } catch (error) {
      console.error('[Scheduled Prediction Error]', error);
      return null;
    }
  });

/**
 * Send notification for high-risk tasks
 */
async function sendHighRiskNotification(projectId, predictions) {
  const highRiskTasks = predictions.filter(p => p.riskLevel === 'High');
  
  if (highRiskTasks.length === 0) return;
  
  // Get project engineers
  const projectDoc = await db.collection('projects').doc(projectId).get();
  const engineerIds = projectDoc.data().engineerIds || [];
  
  // Send notification to each engineer
  for (const engineerId of engineerIds) {
    await db.collection('notifications').add({
      userId: engineerId,
      type: 'high_risk_delay',
      title: '⚠️ High Risk Tasks Detected',
      message: `${highRiskTasks.length} task(s) are at high risk of delay`,
      projectId,
      tasks: highRiskTasks.map(t => t.taskId),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
    });
  }
  
  console.log(`[Notification] Sent to ${engineerIds.length} engineers for project ${projectId}`);
}

// ============================================================================
// Export all functions
// ============================================================================

module.exports = {
  predictDelay: exports.predictDelay,
  predictAllDelays: exports.predictAllDelays,
  scheduledDelayPrediction: exports.scheduledDelayPrediction,
};

