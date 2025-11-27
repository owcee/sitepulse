# 🧠 SITEPULSE AI/ML Integration Guide

**Version:** 1.0  
**Last Updated:** November 27, 2025  
**Purpose:** Complete guide for integrating machine learning models into SITEPULSE construction management app

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [What the AI Models Do](#what-the-ai-models-do)
3. [Model 1: CNN Progress Classification](#model-1-cnn-progress-classification)
4. [Model 2: Delay Prediction](#model-2-delay-prediction)
5. [How Both Models Work Together](#how-both-models-work-together)
6. [Files in This Bundle](#files-in-this-bundle)
7. [Integration Instructions](#integration-instructions)
8. [Model Performance & Evaluation](#model-performance--evaluation)
9. [Deployment Requirements](#deployment-requirements)
10. [Testing & Validation](#testing--validation)

---

## 🎯 Overview

SITEPULSE uses **two AI/ML models** to intelligently monitor construction progress and predict project delays:

1. **CNN (Convolutional Neural Network)** - Classifies construction progress from photos
2. **Linear Regression Model** - Predicts task delays based on multiple factors

**Key Feature:** The CNN model provides automatic progress tracking for 5 visually-verifiable tasks, while the delay prediction model works for **ALL 75+ task types** in the system.

---

## 🤖 What the AI Models Do

### **Model 1: CNN - Construction Progress Classifier**

**Input:** Photo of construction work  
**Output:** Progress stage classification + confidence percentage

**Example:**
```
Input: Photo of partially built concrete foundation
Output: 
  - Label: "concrete_pouring_in_progress"
  - Confidence: 86%
  - Auto-calculated Progress: 50%
```

### **Model 2: Delay Prediction - Linear Regression**

**Input:** Task data (progress, duration, issue flags)  
**Output:** Predicted completion time + delay risk level

**Example:**
```
Input:
  - Task: "Concrete pouring"
  - Planned: 10 days
  - Days passed: 5
  - Progress: 30% (from CNN)
  - Material shortage: Yes
  
Output:
  - Predicted duration: 15 days
  - Delay: 5 days
  - Risk level: HIGH
```

---

## 🔵 Model 1: CNN Progress Classification

### **Purpose**
Automatically classify construction task progress from worker-uploaded photos into three stages:
- **Not Started** (0% progress)
- **In Progress** (50% progress)
- **Completed** (100% progress)

### **Eligible Activities (5 tasks)**

| Activity | Why CNN-Eligible |
|----------|------------------|
| **Concrete Pouring** | Clear visual stages: formwork → wet concrete → cured |
| **CHB (Hollow Block) Laying** | Visible progress: wall height increases |
| **Roof Sheeting/Panel Installation** | Observable coverage: panels installed vs uncovered |
| **Tile Laying** | Measurable: tiled area vs bare surface |
| **Painting** | Distinguishable: unpainted → primer → topcoat |

### **Technical Specifications**

| Specification | Value |
|--------------|-------|
| **Architecture** | MobileNetV3-Large (transfer learning) |
| **Input Size** | 224×224 RGB images |
| **Output Classes** | 15 (5 activities × 3 stages) |
| **Model Size** | ~5-6 MB |
| **Accuracy** | 82.3% |
| **F1 Score** | 0.80 (weighted), 0.797 (macro) |
| **Inference Time** | <100ms on mobile device |
| **Deployment** | On-device (TensorFlow Lite) |

### **How It Works**

```
1. Worker opens task (e.g., "Concrete Pouring")
2. Worker takes photo of current work
3. CNN model processes image on-device
4. Model outputs: "concrete_pouring_in_progress" (86% confidence)
5. App auto-calculates: progressPercent = 50
6. Engineer reviews and approves/overrides
7. Verified progress saved to database
```

### **Output Format**

```typescript
interface CNNPrediction {
  label: string;              // "concrete_pouring_in_progress"
  confidence: number;         // 0.86 (86%)
  stage: "not_started" | "in_progress" | "completed";
  activity: string;           // "concrete_pouring"
  autoProgress: number;       // 0, 50, or 100
  timestamp: string;          // ISO timestamp
}
```

### **Confidence Thresholds**

- **≥80%**: High confidence - Auto-approve eligible
- **70-79%**: Medium confidence - Review recommended
- **<70%**: Low confidence - Manual verification required

---

## 🔵 Model 2: Delay Prediction (Linear Regression)

### **Purpose**
Predict whether a construction task will be delayed and estimate final completion time.

### **Applies To**
**ALL 75+ task types** in SITEPULSE (both CNN-eligible and non-CNN tasks)

### **Input Features**

| Feature | Type | Description | Source |
|---------|------|-------------|--------|
| `taskType` | Categorical | Type of construction task | Task creation |
| `plannedDuration` | Numeric | Original planned days | Task creation |
| `daysPassed` | Numeric | Days since task started | Auto-calculated |
| `progressPercent` | Numeric | Current progress (0-100) | **CNN or manual input** |
| `material_shortage` | Binary | Material delay flag | Daily survey |
| `equipment_breakdown` | Binary | Equipment issue flag | Daily survey |
| `weather_issue` | Binary | Weather delay flag | Daily survey |
| `permit_issue` | Binary | Permit/approval delay | Daily survey |

### **Output**

```typescript
interface DelayPrediction {
  predictedDuration: number;    // Estimated total days
  delayDays: number;            // Difference from planned
  riskLevel: "Low" | "Medium" | "High";
  confidence: number;           // Model confidence
  factors: string[];            // Contributing delay factors
}
```

### **Risk Classification**

| Risk Level | Delay Range | Color Code | Action Required |
|------------|-------------|------------|-----------------|
| **Low** | 0-2 days | 🟢 Green | Monitor normally |
| **Medium** | 2-5 days | 🟡 Yellow | Review resources |
| **High** | >5 days | 🔴 Red | Immediate intervention |

### **Model Performance**

| Metric | Value | Meaning |
|--------|-------|---------|
| **R² Score** | 0.922 | 92.2% of variance explained |
| **MAE** | 1.032 days | Average prediction error |
| **RMSE** | 1.342 days | Root mean squared error |
| **F1 Score** | 0.771 | Delayed vs On-time classification |

### **Example Scenarios**

#### Scenario 1: CNN-Eligible Task (Concrete Pouring)
```javascript
Input: {
  taskType: "Concrete pouring",
  cnnEligible: true,
  plannedDuration: 10,
  daysPassed: 5,
  progressPercent: 50,        // FROM CNN
  material_shortage: 0,
  equipment_breakdown: 0,
  weather_issue: 1,
  permit_issue: 0
}

Prediction: {
  predictedDuration: 12,
  delayDays: 2,
  riskLevel: "Medium"
}
```

#### Scenario 2: Non-CNN Task (Door Hanging)
```javascript
Input: {
  taskType: "Door hanging",
  cnnEligible: false,
  plannedDuration: 4,
  daysPassed: 2,
  progressPercent: 60,        // MANUAL INPUT from worker
  material_shortage: 1,
  equipment_breakdown: 0,
  weather_issue: 0,
  permit_issue: 0
}

Prediction: {
  predictedDuration: 6,
  delayDays: 2,
  riskLevel: "Medium"
}
```

**Key Point:** The delay model doesn't care WHERE `progressPercent` comes from—it just needs the value!

---

## 🔄 How Both Models Work Together

```
┌──────────────────────────────────────────────────────────┐
│                    TASK CREATION                         │
│                     (Engineer)                           │
└──────────────────────────────────────────────────────────┘
                        │
          ┌─────────────┴─────────────┐
          │                           │
          ▼                           ▼
┌──────────────────┐        ┌──────────────────┐
│ CNN-Eligible     │        │ Non-CNN Task     │
│ Task Created     │        │ Created          │
│ (5 activities)   │        │ (70+ tasks)      │
└──────────────────┘        └──────────────────┘
          │                           │
          ▼                           ▼
┌──────────────────┐        ┌──────────────────┐
│ Worker Uploads   │        │ Worker Updates   │
│ Photo            │        │ Progress Slider  │
│                  │        │ (Manual 0-100%)  │
└──────────────────┘        └──────────────────┘
          │                           │
          ▼                           │
┌──────────────────┐                 │
│ CNN Model        │                 │
│ (On-Device)      │                 │
│ Processes Image  │                 │
└──────────────────┘                 │
          │                           │
          ▼                           │
┌──────────────────┐                 │
│ Prediction:      │                 │
│ "in_progress"    │                 │
│ Confidence: 86%  │                 │
└──────────────────┘                 │
          │                           │
          ▼                           │
┌──────────────────┐                 │
│ Auto-Calculate   │                 │
│ progressPercent  │                 │
│ = 50             │                 │
└──────────────────┘                 │
          │                           │
          └───────────┬───────────────┘
                      │
                      ▼
        ┌───────────────────────────┐
        │ Engineer Verification     │
        │ Dashboard                 │
        │ - View CNN prediction     │
        │ - View manual progress    │
        │ - Approve or Override     │
        └───────────────────────────┘
                      │
                      ▼
        ┌───────────────────────────┐
        │ Firestore Database        │
        │ - Save progressPercent    │
        │ - Save CNN prediction     │
        │ - Update task status      │
        └───────────────────────────┘
                      │
                      ▼
        ┌───────────────────────────┐
        │ Delay Prediction Model    │
        │ (Cloud Function/API)      │
        │                           │
        │ Uses progressPercent      │
        │ (from CNN OR manual)      │
        │ + other features          │
        └───────────────────────────┘
                      │
                      ▼
        ┌───────────────────────────┐
        │ Dashboard Display         │
        │ 📊 Progress Timeline      │
        │ ⚠️  Delay Warnings         │
        │ 🧠 CNN Insights           │
        │ 📈 Risk Indicators        │
        └───────────────────────────┘
```

---

## 📦 Files in This Bundle

### **models/** (Required for deployment)

| File | Size | Purpose |
|------|------|---------|
| `model_optimized.tflite` | ~5-6 MB | CNN model for on-device inference |
| `labels_improved.json` | <1 KB | Maps CNN output indices to class names |
| `delay_model_weights.json` | ~10 KB | Linear regression coefficients |

### **documentation/** (For reference)

| File | Purpose |
|------|---------|
| `confusion_matrix_improved.png` | CNN per-class performance visualization |
| `training_history_improved.png` | CNN training/validation curves |
| `f1_scores.png` | F1 scores per class bar chart |
| `metrics_improved.json` | Complete CNN evaluation metrics |

### **deployment/** (Integration examples)

| File | Purpose |
|------|---------|
| `tflite_integration_example.tsx` | React Native TFLite implementation |
| `delay_prediction_cloud_function.js` | Firebase Cloud Function example |

---

## 🚀 Integration Instructions

### **Step 1: Install Dependencies**

```bash
# Navigate to your React Native project
cd YourReactNativeApp

# Install TensorFlow Lite
npm install tflite-react-native

# Install Firebase Functions
npm install @react-native-firebase/functions

# Link native dependencies (if using older React Native)
npx react-native link
```

### **Step 2: Copy Model Files to App**

```bash
# Create assets folder if it doesn't exist
mkdir -p assets/ml

# Copy model files from this bundle
cp SITEPULSE_ML_BUNDLE/models/model_optimized.tflite YourApp/assets/ml/
cp SITEPULSE_ML_BUNDLE/models/labels_improved.json YourApp/assets/ml/
```

### **Step 3: Configure Asset Loading**

Add to `react-native.config.js`:
```javascript
module.exports = {
  project: {
    ios: {},
    android: {},
  },
  assets: ['./assets/ml/'],
};
```

### **Step 4: Implement CNN Integration**

See `deployment/tflite_integration_example.tsx` for complete code.

**Quick example:**
```typescript
import Tflite from 'tflite-react-native';

// Initialize CNN model (once at app startup)
const tflite = new Tflite();
await tflite.loadModel({
  model: 'model_optimized.tflite',
  labels: 'labels_improved.json',
});

// When worker uploads image
const handleImageUpload = async (imageUri: string) => {
  const predictions = await tflite.runModelOnImage({
    path: imageUri,
    imageMean: 127.5,
    imageStd: 127.5,
    numResults: 1,
  });
  
  const result = predictions[0];
  // result = { label: "concrete_pouring_in_progress", confidence: 0.86 }
  
  const progressPercent = getProgressFromLabel(result.label);
  // progressPercent = 50
  
  return { ...result, progressPercent };
};
```

### **Step 5: Deploy Delay Prediction API**

Upload `delay_model_weights.json` to Firebase Functions:

```bash
# Copy to Firebase functions folder
cp SITEPULSE_ML_BUNDLE/models/delay_model_weights.json firebase/functions/

# Deploy function (see deployment/delay_prediction_cloud_function.js)
firebase deploy --only functions:predictDelay
```

### **Step 6: Integrate in Worker UI**

```typescript
// In WorkerTaskUpdateScreen.tsx
const handleTaskUpdate = async () => {
  let progressPercent;
  let aiPrediction = null;
  
  if (task.cnnEligible && uploadedImage) {
    // Use CNN for eligible tasks
    const cnnResult = await runCNNInference(uploadedImage);
    progressPercent = cnnResult.progressPercent;
    aiPrediction = cnnResult;
  } else {
    // Manual input for non-CNN tasks
    progressPercent = manualSliderValue;
  }
  
  // Save to Firestore
  await updateTask(task.id, {
    progressPercent,
    aiPrediction,
    workerNotes,
  });
  
  // Trigger delay prediction
  const delayPrediction = await predictDelay(task.id);
  // Display warning if high risk
};
```

---

## 📊 Model Performance & Evaluation

### **CNN Model Evaluation**

**Overall Metrics:**
- **Test Accuracy**: 82.3%
- **F1 Score (Weighted)**: 0.80
- **F1 Score (Macro)**: 0.797
- **Training Epochs**: 35 (15 stage 1 + 20 stage 2)
- **Dataset Size**: 7,600 images

**Per-Class Performance** (see `documentation/confusion_matrix_improved.png`):
- Best performing: Concrete pouring completed (90%+ accuracy)
- Challenging classes: Not started stages (visual similarity across activities)

**Recommendations:**
1. For confidence <70%, always require manual verification
2. Collect more data for poorly performing classes
3. Retrain quarterly with new real-world images

### **Delay Prediction Model Evaluation**

**Regression Metrics:**
- **R² Score**: 0.922 (excellent fit)
- **MAE**: 1.032 days (average error ~1 day)
- **RMSE**: 1.342 days

**Classification Metrics** (Delayed vs On-Time):
- **Accuracy**: 68.3%
- **Precision**: 62.7%
- **Recall**: 100%
- **F1 Score**: 0.771

**Key Insights:**
- Model tends to predict delays conservatively (high recall)
- Most predictions within 1-2 days of actual
- Weather and permit issues are strongest delay predictors

---

## 🖥️ Deployment Requirements

### **Mobile App Requirements (CNN)**

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| **iOS** | iOS 12+ | iOS 14+ |
| **Android** | Android 7.0 (API 24) | Android 10+ |
| **RAM** | 2GB | 4GB+ |
| **Storage** | +10MB | +20MB |
| **Camera** | 5MP | 12MP+ |

### **Backend Requirements (Delay Prediction)**

| Service | Requirement |
|---------|-------------|
| **Firebase** | Blaze plan (Cloud Functions) |
| **Function Memory** | 256MB minimum |
| **Function Timeout** | 60 seconds |
| **Cold Start Time** | ~2-3 seconds |

### **Network Requirements**

- **CNN**: Works **offline** (on-device inference)
- **Delay Prediction**: Requires **internet connection**
- **Recommended**: Cache delay predictions for 1 hour

---

## ✅ Testing & Validation

### **CNN Testing Checklist**

- [ ] Model loads successfully on app startup
- [ ] Image capture works on both iOS and Android
- [ ] Inference completes in <500ms
- [ ] All 15 classes return valid predictions
- [ ] Confidence scores are between 0-1
- [ ] Low confidence triggers manual review
- [ ] Predictions logged to Firestore

**Test Images:**
Use images from `ml/dataset_standardized/` for testing each class.

### **Delay Prediction Testing**

- [ ] API endpoint responds within 2 seconds
- [ ] Handles missing features gracefully
- [ ] Returns valid predictions for all 75+ task types
- [ ] Risk levels calculated correctly
- [ ] Predictions logged for analysis
- [ ] Error handling for invalid inputs

**Test Cases:**
```javascript
// Test 1: CNN task with high progress
{ taskType: "Concrete pouring", progressPercent: 90, daysPassed: 8, plannedDuration: 10 }
// Expected: Low risk, on-time

// Test 2: Non-CNN task with delays
{ taskType: "Door hanging", progressPercent: 30, daysPassed: 3, plannedDuration: 4, material_shortage: 1 }
// Expected: High risk, delayed

// Test 3: Edge case - no progress
{ taskType: "Painting", progressPercent: 0, daysPassed: 5, plannedDuration: 10 }
// Expected: Medium-High risk
```

---

## 🔧 Troubleshooting

### **CNN Issues**

**Problem:** Model not loading
```
Solution: Check file paths and ensure .tflite and .json files are in assets/ml/
```

**Problem:** Low accuracy in production
```
Solution: 
1. Verify image preprocessing (224×224, RGB, normalized)
2. Check camera quality and lighting
3. Collect production images and retrain
```

**Problem:** Slow inference
```
Solution:
1. Reduce image quality before inference
2. Use GPU delegate if available
3. Consider switching to MobileNetV3-Small
```

### **Delay Prediction Issues**

**Problem:** Predictions always high/low
```
Solution: Check feature scaling - ensure progressPercent is 0-100, not 0-1
```

**Problem:** Function timeout
```
Solution: Increase Cloud Function memory to 512MB
```

---

## 📚 For Thesis Documentation

### **Required Sections**

1. **Methodology**
   - CNN architecture diagram
   - Training procedure (2-stage transfer learning)
   - Delay model feature engineering

2. **Results**
   - Include all images from `documentation/`
   - Confusion matrix analysis
   - F1 scores per class
   - Delay prediction scatter plot

3. **Discussion**
   - Why MobileNetV3 was chosen (mobile optimization)
   - Trade-offs: accuracy vs model size
   - Real-world deployment considerations

4. **Limitations**
   - CNN requires good lighting
   - Limited to 5 activities
   - Delay model assumes honest progress reporting

---

## 🔄 Model Maintenance

### **When to Retrain CNN**

- **Quarterly**: Standard maintenance
- **When accuracy drops**: Below 75% in production
- **New activities added**: Collect 500+ images per stage
- **Significant changes**: New construction methods or materials

### **When to Retrain Delay Model**

- **Monthly**: As new project data accumulates
- **When MAE increases**: Above 2 days
- **New task types**: Added to SITEPULSE
- **Seasonal changes**: Different weather patterns

---

## 📞 Support & Contact

For questions about this integration:
- Check `deployment/` folder for code examples
- Review `documentation/` for visual explanations
- Refer to original training scripts in parent directory

---

## 📄 License & Attribution

**Models trained for:** SITEPULSE Construction Management System  
**Training Date:** November 25-27, 2025  
**Framework:** TensorFlow 2.13+  
**Base Architecture:** MobileNetV3 (Apache 2.0 License)

---

**✅ You're Ready to Deploy!**

All files needed for integration are in this bundle. Follow the integration instructions step-by-step, and refer to the deployment examples for working code.

Good luck with your thesis! 🚀🏗️

