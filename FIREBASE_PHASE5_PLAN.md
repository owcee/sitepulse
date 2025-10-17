# 🚀 Firebase Phase 5 - AI/ML & Push Notifications

> **Status:** Planning  
> **Prerequisites:** Phase 4 Complete  
> **Focus:** Machine Learning, CNN Photo Classification, Push Notifications  
> **Estimated Duration:** 2-3 weeks

---

## 📋 Executive Summary

Phase 5 introduces advanced AI/ML capabilities and production-ready push notifications to transform SitePulse into an intelligent construction management platform.

### Key Goals
1. **CNN Photo Classification** - Automatic task verification using computer vision
2. **Delay Prediction ML** - Predictive analytics for project timeline risks
3. **Push Notifications** - Real-time alerts via Firebase Cloud Messaging (FCM)
4. **Model Optimization** - Efficient inference for mobile devices

---

## 🎯 High-Level Objectives

| Objective | Priority | Complexity | Value |
|-----------|----------|------------|-------|
| Push Notifications (FCM) | P0 | Medium | High |
| CNN Photo Classification | P0 | High | High |
| Delay Prediction Model | P1 | Very High | Medium |
| Model Performance Optimization | P1 | High | Medium |
| Offline ML Inference | P2 | High | Low |

---

## 📦 Phase 5 Work Items

### **P0 - Critical Priority**

#### P0-1: Firebase Cloud Messaging (FCM) Integration
**Effort:** 2 days  
**Description:** Enable push notifications for iOS and Android

**Tasks:**
- [ ] Configure FCM in Firebase Console
- [ ] Generate VAPID keys for web push
- [ ] Integrate `expo-notifications` package
- [ ] Request notification permissions on app launch
- [ ] Save FCM tokens to user profiles
- [ ] Test foreground notifications
- [ ] Test background notifications
- [ ] Test notification tap actions

**Files to Modify:**
- `App.tsx` - Request permissions, save token
- `src/services/fcmService.ts` - Already created, needs integration
- `functions/index.js` - Deploy `onNotificationCreate` function

**Acceptance Criteria:**
- Users receive push notifications on iOS and Android
- Tapping notification navigates to relevant screen
- Tokens saved to Firestore on login
- Background notifications work when app is closed

---

#### P0-2: Deploy Cloud Functions for Notifications
**Effort:** 1 day  
**Description:** Deploy server-side notification triggers

**Tasks:**
- [ ] Configure Firebase Admin SDK
- [ ] Deploy `onNotificationCreate` Cloud Function
- [ ] Test notification delivery
- [ ] Add retry logic for failed sends
- [ ] Monitor function logs
- [ ] Set up error alerts

**Files to Modify:**
- `functions/index.js` - Already has code, needs deployment
- `functions/package.json` - Verify dependencies

**Acceptance Criteria:**
- Cloud Function triggers on new notification documents
- FCM sends push notifications successfully
- Errors logged to Cloud Functions console
- Notification payload includes correct data

---

#### P0-3: CNN Photo Classification Model
**Effort:** 5 days  
**Description:** Real-time construction task photo classification

**Tasks:**
- [ ] Choose model architecture (MobileNet, EfficientNet, or custom)
- [ ] Collect/label training data (construction images)
- [ ] Train model on construction-specific dataset
- [ ] Convert model to TensorFlow.js format
- [ ] Integrate TensorFlow.js into app
- [ ] Implement real-time inference
- [ ] Add confidence threshold logic
- [ ] Cache model for offline use

**Dataset Categories (Examples):**
```
- concrete_pouring
- steel_framework
- electrical_wiring
- plumbing_installation
- finishing_work
- excavation
- foundation_work
- roofing
- painting
- masonry
```

**Files to Modify:**
- `src/services/cnnService.ts` - NEW: Model loading and inference
- `src/screens/worker/PhotoUploadScreen.tsx` - Replace mock with real CNN
- `package.json` - Add `@tensorflow/tfjs` and `@tensorflow/tfjs-react-native`

**Model Storage Options:**
1. **Firebase Storage** - Download on first use
2. **Bundled with app** - Larger app size but instant access
3. **CDN** - Fast download from external server

**Acceptance Criteria:**
- Model classifies construction photos with >80% accuracy
- Inference completes in < 3 seconds
- Works on iOS and Android
- Confidence score displayed to user
- Low-confidence predictions flagged for manual review

---

### **P1 - High Priority**

#### P1-1: Delay Prediction ML Model
**Effort:** 7-10 days  
**Description:** Predict project delays using historical data and current progress

**Approach Options:**

**Option A: Cloud-Based (Recommended)**
- Train model in Python (scikit-learn or TensorFlow)
- Deploy as Cloud Function or Cloud Run API
- App calls API for predictions

**Option B: On-Device**
- Train model and convert to TensorFlow.js
- Run inference in the app
- Faster but limited by device resources

**Input Features:**
```python
features = {
  'planned_days': int,
  'elapsed_days': int,
  'tasks_completed': int,
  'tasks_total': int,
  'budget_spent_percent': float,
  'worker_count': int,
  'weather_delays': int,        # Optional
  'material_shortages': int,    # Optional
  'equipment_downtime_hours': int,
  'task_approval_rate': float,
  'average_task_delay_days': float
}
```

**Output:**
```python
prediction = {
  'delay_probability': 0.75,    # 0-1
  'estimated_delay_days': 14,
  'confidence': 0.82,
  'risk_factors': [
    'budget_overrun',
    'task_completion_rate_low'
  ],
  'recommendations': [
    'Increase worker count',
    'Prioritize critical path tasks'
  ]
}
```

**Tasks:**
- [ ] Collect historical project data for training
- [ ] Feature engineering and data preprocessing
- [ ] Train regression/classification model
- [ ] Evaluate model performance (MAE, RMSE, accuracy)
- [ ] Deploy model (Cloud Function or TensorFlow.js)
- [ ] Build API endpoint for predictions
- [ ] Integrate with `DelayPredictionScreen.tsx`
- [ ] Add visualization (risk meter, timeline chart)

**Files to Create:**
- `ml_models/delay_prediction/train.py` - Training script
- `ml_models/delay_prediction/predict.py` - Inference script
- `functions/delayPrediction.js` - Cloud Function endpoint
- `src/services/mlService.ts` - ML API client

**Files to Modify:**
- `src/screens/engineer/DelayPredictionScreen.tsx` - Connect to real model

**Acceptance Criteria:**
- Model predicts delays with >70% accuracy
- Predictions update daily based on latest data
- Risk factors clearly explained to engineers
- Actionable recommendations provided

---

#### P1-2: Model Performance Optimization
**Effort:** 3 days  
**Description:** Optimize ML models for mobile devices

**Tasks:**
- [ ] Quantize CNN model (reduce size by 75%)
- [ ] Implement model caching
- [ ] Add loading indicators during inference
- [ ] Optimize image preprocessing
- [ ] Test on low-end devices
- [ ] Benchmark inference speed
- [ ] Profile memory usage

**Techniques:**
- **Quantization:** Convert float32 to int8 weights
- **Pruning:** Remove low-importance neurons
- **Caching:** Store model in AsyncStorage after first download
- **Image Resizing:** Downscale images before inference

**Target Performance:**
- CNN Inference: < 2 seconds
- Model Download: < 5 MB
- Memory Usage: < 100 MB
- Works on devices with 2GB RAM

**Files to Modify:**
- `src/services/cnnService.ts` - Add optimization logic
- `src/utils/imageProcessing.ts` - NEW: Image preprocessing utilities

**Acceptance Criteria:**
- Model loads in < 3 seconds on first use
- Inference runs smoothly on mid-range phones
- App doesn't crash on low-end devices
- Model cached for offline use

---

### **P2 - Nice-to-Have**

#### P2-1: Offline ML Inference
**Effort:** 2 days  
**Description:** Enable CNN predictions without internet

**Tasks:**
- [ ] Bundle optimized model with app
- [ ] Implement fallback to bundled model
- [ ] Test offline classification
- [ ] Handle model version updates

**Files to Modify:**
- `src/services/cnnService.ts` - Offline fallback logic
- `assets/models/` - NEW: Bundled model files

**Acceptance Criteria:**
- CNN works without internet after first model download
- Model updates when new version available
- Graceful degradation if model fails to load

---

#### P2-2: Advanced Analytics Dashboard
**Effort:** 3 days  
**Description:** ML-powered insights for project managers

**Features:**
- Task completion trend prediction
- Budget overrun early warning
- Worker productivity analytics
- Material usage forecasting

**Files to Create:**
- `src/screens/engineer/AnalyticsDashboard.tsx` - NEW screen
- `src/services/analyticsService.ts` - Analytics logic

**Acceptance Criteria:**
- Insights update daily
- Charts clearly visualize trends
- Predictions actionable for engineers

---

## 🗂️ New Firestore Collections

### Collection: `ml_predictions`
```typescript
{
  id: string;
  projectId: string;
  type: 'delay' | 'budget' | 'completion';
  prediction: {
    value: number;
    confidence: number;
    riskFactors: string[];
    recommendations: string[];
  };
  inputFeatures: object;
  modelVersion: string;
  createdAt: Timestamp;
  expiresAt: Timestamp; // Predictions expire after 24 hours
}
```

### Collection: `photo_classifications`
```typescript
{
  id: string;
  photoId: string;
  taskId: string;
  projectId: string;
  classification: {
    label: string;
    confidence: number;
    alternativeLabels: {
      label: string;
      confidence: number;
    }[];
  };
  modelVersion: string;
  processingTimeMs: number;
  createdAt: Timestamp;
}
```

---

## 🧠 Machine Learning Architecture

### CNN Photo Classification Pipeline

```
Worker captures photo
        ↓
Resize image (224x224 or 299x299)
        ↓
Normalize pixel values (0-1)
        ↓
Run inference (TensorFlow.js)
        ↓
Get top 3 predictions with confidence scores
        ↓
If confidence > 0.8: Auto-classify
If confidence < 0.8: Flag for engineer review
        ↓
Save classification to Firestore
        ↓
Update task verification status
```

### Delay Prediction Pipeline

```
Engineer opens Delay Prediction screen
        ↓
Fetch current project metrics from Firestore
        ↓
Calculate derived features
        ↓
Call Cloud Function API
        ↓
Cloud Function runs ML model
        ↓
Return prediction + risk factors
        ↓
Display results with visualizations
        ↓
Cache prediction for 24 hours
```

---

## 🛠️ Technical Implementation

### 1. TensorFlow.js Setup

**Install Dependencies:**
```bash
npm install @tensorflow/tfjs @tensorflow/tfjs-react-native
npm install @react-native-community/async-storage
npm install expo-gl
```

**Initialize in App:**
```typescript
// App.tsx
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';

// In useEffect
await tf.ready();
console.log('TensorFlow.js ready:', tf.version.tfjs);
```

### 2. CNN Service

**File:** `src/services/cnnService.ts`

```typescript
import * as tf from '@tensorflow/tfjs';
import { fetch } from '@tensorflow/tfjs-react-native';

let model: tf.LayersModel | null = null;

export async function loadCNNModel(): Promise<void> {
  if (model) return;
  
  const modelUrl = 'https://storage.googleapis.com/sitepulse-models/construction-classifier/model.json';
  model = await tf.loadLayersModel(modelUrl);
  console.log('CNN model loaded');
}

export async function classifyImage(imageUri: string): Promise<Classification> {
  if (!model) await loadCNNModel();
  
  // Preprocess image
  const imageTensor = await preprocessImage(imageUri);
  
  // Run inference
  const predictions = model.predict(imageTensor) as tf.Tensor;
  const probabilities = await predictions.data();
  
  // Get top predictions
  const topPredictions = getTopN(probabilities, 3);
  
  return {
    label: topPredictions[0].label,
    confidence: topPredictions[0].score,
    alternatives: topPredictions.slice(1)
  };
}

async function preprocessImage(uri: string): Promise<tf.Tensor> {
  // Load image
  const response = await fetch(uri);
  const imageData = await response.arrayBuffer();
  const imageTensor = tf.browser.fromPixels(imageData);
  
  // Resize to model input size
  const resized = tf.image.resizeBilinear(imageTensor, [224, 224]);
  
  // Normalize (0-1)
  const normalized = resized.div(255.0);
  
  // Add batch dimension
  return normalized.expandDims(0);
}
```

### 3. Push Notification Integration

**File:** `App.tsx` (add to existing)

```typescript
import * as Notifications from 'expo-notifications';
import { saveFCMToken } from './src/services/fcmService';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// In useEffect after auth
useEffect(() => {
  if (user) {
    registerForPushNotifications();
  }
}, [user]);

async function registerForPushNotifications() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.log('Notification permission denied');
    return;
  }
  
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  await saveFCMToken(token);
  console.log('FCM token saved:', token);
}
```

---

## 📊 Training Data Requirements

### CNN Photo Classification

**Minimum Dataset Size:**
- 1,000 images per category (10 categories = 10,000 total)
- 80/20 train/validation split

**Data Sources:**
1. Manual labeling by engineers (use existing task photos)
2. Public construction datasets (ImageNet, COCO)
3. Data augmentation (rotation, flip, brightness)

**Labeling Tool:**
- Use [Label Studio](https://labelstud.io/) or [Roboflow](https://roboflow.com/)
- Export to TensorFlow format

### Delay Prediction Model

**Minimum Dataset:**
- 50+ completed projects with historical data
- Features: task completion times, budget logs, worker assignments

**Synthetic Data (for MVP):**
- Generate synthetic project data with known outcomes
- Use to bootstrap model before real data available

---

## 🧪 Testing Strategy

### CNN Testing
- [ ] Unit tests for image preprocessing
- [ ] Integration tests for model loading
- [ ] E2E tests for classification flow
- [ ] Performance benchmarks on real devices
- [ ] Accuracy tests against validation set

### Delay Prediction Testing
- [ ] Unit tests for feature engineering
- [ ] API tests for Cloud Function
- [ ] Accuracy tests on historical data
- [ ] A/B test predictions vs actual outcomes

### Push Notification Testing
- [ ] Test on iOS physical device
- [ ] Test on Android physical device
- [ ] Test foreground notifications
- [ ] Test background notifications
- [ ] Test notification tap actions
- [ ] Test token refresh

---

## 📦 Dependencies to Install

```json
{
  "@tensorflow/tfjs": "^4.11.0",
  "@tensorflow/tfjs-react-native": "^0.8.0",
  "expo-gl": "~13.2.0",
  "expo-notifications": "~0.23.0",
  "expo-device": "~5.6.0",
  "@react-native-community/async-storage": "^1.12.1"
}
```

**Python (for model training):**
```
tensorflow==2.13.0
tensorflowjs==4.11.0
scikit-learn==1.3.0
pandas==2.0.3
numpy==1.24.3
matplotlib==3.7.2
```

---

## 🚀 Deployment Steps

### Step 1: Deploy Cloud Functions
```bash
cd functions
npm install
firebase deploy --only functions:onNotificationCreate
firebase deploy --only functions:predictDelay
```

### Step 2: Upload CNN Model to Firebase Storage
```bash
# After training
tensorflowjs_converter \
  --input_format keras \
  construction_classifier.h5 \
  ./tfjs_model

# Upload to Firebase Storage
firebase storage:upload ./tfjs_model gs://sitepulse-2d882.appspot.com/models/cnn/
```

### Step 3: Update App with New Dependencies
```bash
npm install
expo prebuild  # For React Native compatibility
```

### Step 4: Test on Physical Devices
```bash
# iOS
expo run:ios --device

# Android
expo run:android --device
```

---

## 🎯 Acceptance Criteria (Phase 5 Complete)

- [ ] Push notifications work on iOS and Android
- [ ] Workers receive real-time alerts for task assignments
- [ ] Engineers receive photo approval requests
- [ ] CNN classifies construction photos with >80% accuracy
- [ ] Low-confidence predictions flagged for review
- [ ] Delay prediction model provides actionable insights
- [ ] ML predictions cached for 24 hours
- [ ] All models optimized for mobile devices
- [ ] Offline CNN inference works
- [ ] No crashes on low-end devices
- [ ] Model versions tracked in Firestore
- [ ] Error logging for ML failures

---

## ⚠️ Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Low model accuracy | High | Use transfer learning from pre-trained models |
| Slow inference on old devices | Medium | Quantize models, add loading states |
| Insufficient training data | High | Use data augmentation, synthetic data |
| Push notification rate limits | Medium | Batch notifications, use FCM topics |
| Model size too large | Medium | Quantization, pruning, compression |
| Cloud Function cold starts | Low | Use Cloud Run or keep functions warm |

---

## 📈 Success Metrics

### CNN Photo Classification
- **Accuracy:** >80% on validation set
- **Inference Speed:** <3 seconds per photo
- **User Acceptance:** Engineers approve 90%+ of auto-classifications

### Delay Prediction
- **Prediction Accuracy:** >70% (within 5 days of actual delay)
- **Engagement:** Engineers check predictions weekly
- **Actionability:** 50%+ of recommendations implemented

### Push Notifications
- **Delivery Rate:** >95%
- **Open Rate:** >60%
- **Engagement:** Users respond to notifications within 1 hour

---

## 🎓 Learning Resources

### TensorFlow.js
- [Official Docs](https://www.tensorflow.org/js)
- [React Native Guide](https://www.tensorflow.org/js/tutorials/react_native)

### Model Training
- [Transfer Learning Tutorial](https://www.tensorflow.org/tutorials/images/transfer_learning)
- [Image Classification](https://www.tensorflow.org/tutorials/images/classification)

### Firebase ML
- [ML Kit](https://firebase.google.com/docs/ml)
- [Cloud Functions for ML](https://firebase.google.com/docs/functions/ml)

### Push Notifications
- [Expo Notifications](https://docs.expo.dev/push-notifications/overview/)
- [FCM Documentation](https://firebase.google.com/docs/cloud-messaging)

---

## 💰 Cost Estimate (Firebase Usage)

### Cloud Functions
- `onNotificationCreate`: ~10,000 invocations/month = **$0** (free tier)
- `predictDelay`: ~1,000 invocations/month = **$0** (free tier)

### Firebase Storage (Model Hosting)
- CNN Model: ~50 MB
- Downloads: ~1,000/month = ~50 GB
- Cost: **$0.026/GB** = ~$1.30/month

### Cloud Messaging (FCM)
- **Free** (unlimited messages)

### Total Monthly Cost: **~$2-5**

---

## 📝 Phase 5 Checklist

### Week 1: Push Notifications
- [ ] Day 1-2: FCM integration and permissions
- [ ] Day 3: Deploy Cloud Function
- [ ] Day 4-5: Testing and bug fixes

### Week 2: CNN Photo Classification
- [ ] Day 1-2: Dataset collection and labeling
- [ ] Day 3-4: Model training
- [ ] Day 5: TensorFlow.js conversion and upload

### Week 3: Delay Prediction & Optimization
- [ ] Day 1-3: Delay prediction model training
- [ ] Day 4: Cloud Function API deployment
- [ ] Day 5: Model optimization and testing

---

## 🎉 Phase 5 Complete Criteria

When all of the following are true, Phase 5 is complete:

1. ✅ Push notifications delivered to all users
2. ✅ CNN classifies photos automatically
3. ✅ Delay predictions available in dashboard
4. ✅ All models optimized for mobile
5. ✅ ML features documented
6. ✅ Production testing complete

---

**Ready to Begin?**
1. Review this plan with your team
2. Gather training data for CNN
3. Set up Firebase Cloud Messaging
4. Start with P0 items (notifications and CNN)

**Let's make SitePulse intelligent! 🤖🚀**

