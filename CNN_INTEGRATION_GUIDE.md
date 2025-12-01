# 🤖 CNN Integration Guide - SitePulse

## Overview

SitePulse uses a Task-Aware CNN (Convolutional Neural Network) to automatically predict the **status** of construction tasks based on worker-submitted photos. The CNN only predicts whether a task is `not_started`, `in_progress`, or `completed` - the task type is already known from the app.

---

## ✅ CNN-Eligible Tasks

The CNN model supports **5 construction tasks** with **3 status predictions each** (15 total classes):

| Task ID | Task Name | Tagalog Label | Category |
|---------|-----------|---------------|----------|
| `concrete_pouring` | Concrete pouring | Pagbubuhos ng semento | Foundation Works |
| `chb_laying` | CHB laying | Pag-aayos ng hollow blocks | Masonry Works |
| `roof_sheeting` | Roof sheeting / panel installation | Roof sheeting / panel installation | Roofing Works |
| `tile_laying` | Tile laying (floor and wall) | Paglalagay ng tiles | Finishing Works |
| `painting` | Painting (primer, topcoat) | Pagpintura | Finishing Works |

### Status Predictions

For each task, the CNN predicts one of three statuses:
- **not_started** (0% progress)
- **in_progress** (50% progress)
- **completed** (100% progress)

---

## 📋 How It Works

### Worker Flow

1. **Worker opens task** → CNN initializes in background
2. **Worker takes photo** → Photo is captured via camera
3. **Worker adds notes** (optional) → Notes modal appears
4. **Worker submits photo** → CNN prediction runs automatically
5. **Photo uploaded to Firebase** → With CNN prediction metadata
6. **Engineer reviews** → Can approve/reject based on CNN confidence

### CNN Prediction Process

```
Worker submits photo
        ↓
Check if task.cnnEligible = true
        ↓
Check if TaskAwareCNNModel.isCNNEligible(task.subTask)
        ↓
Run cnnStatusPredictor.predictStatus(photoUri, taskSubTask)
        ↓
Get prediction: { status, confidence, progressPercent, taskMatch }
        ↓
Upload photo with cnnPrediction metadata
        ↓
Engineer sees prediction in ReportLogsScreen
```

### CNN Initialization

```typescript
// In WorkerTaskDetailScreen.tsx
useEffect(() => {
  const initCNN = async () => {
    try {
      await cnnStatusPredictor.initialize();
      setCnnInitialized(true);
    } catch (error) {
      console.error('Failed to initialize CNN:', error);
      // Continue without CNN - it's optional
    }
  };
  initCNN();
}, []);
```

### CNN Prediction Call

```typescript
// When worker submits photo
if (task && task.cnnEligible && cnnInitialized && task.subTask && TaskAwareCNNModel.isCNNEligible(task.subTask)) {
  try {
    setPredictingCnn(true);
    const prediction = await cnnStatusPredictor.predictStatus(
      selectedPhotoUri,
      task.subTask
    );
    cnnPrediction = prediction;
    console.log('[CNN] Prediction result:', prediction);
  } catch (cnnError) {
    console.error('[CNN] Prediction failed:', cnnError);
    // Continue without CNN prediction - don't block upload
  } finally {
    setPredictingCnn(false);
  }
}
```

---

## 🗂️ File Structure

### Model Files

```
android/app/src/main/assets/
├── model_optimized.tflite    # TensorFlow Lite model (5 tasks × 3 statuses)
└── labels_improved.json       # Label mapping (15 classes)
```

### Code Files

```
src/services/cnnService.ts                    # CNN service (Task-Aware Model)
src/screens/worker/WorkerTaskDetailScreen.tsx # CNN initialization & prediction
src/screens/engineer/ReportLogsScreen.tsx     # Display CNN results
src/screens/engineer/TasksScreen.tsx          # Task definitions (cnnEligible flags)
src/screens/engineer/TaskCreationModal.tsx    # Task creation (cnnEligible flags)
```

---

## 🔧 Configuration

### Task-to-CNN Mapping

In `src/services/cnnService.ts`:

```typescript
const TASK_ID_TO_CNN_ACTIVITY: Record<string, string> = {
  'concrete_pouring': 'concrete_pouring',
  'chb_laying': 'chb_laying',
  'roof_sheeting': 'roofing',        // Note: app uses "roof_sheeting", CNN uses "roofing"
  'tile_laying': 'tile_laying',
  'painting': 'painting',
};
```

### CNN Model Parameters

```typescript
await this.tflite.loadModel({
  model: 'model_optimized.tflite',
  labels: 'labels_improved.json',
  numThreads: 2,                  // Use 2 threads for inference
  isQuantized: false,             // Model is not quantized
});
```

### Prediction Parameters

```typescript
const results = await this.tflite.runModelOnImage({
  path: imageUri,
  imageMean: 127.5,               // Normalize: (pixel - 127.5) / 127.5
  imageStd: 127.5,
  numResults: 15,                 // Get all 15 classes
  threshold: 0.0,                 // No confidence threshold
});
```

---

## 📊 CNN Output Structure

### StatusPrediction Interface

```typescript
export interface StatusPrediction {
  status: 'not_started' | 'in_progress' | 'completed';  // Predicted status
  confidence: number;                                    // 0.0 to 1.0
  progressPercent: number;                               // 0, 50, or 100
  taskMatch: boolean;                                    // True if CNN's predicted task matches known task
  predictedTask?: string;                                // What task CNN thought it was (for validation)
  timestamp: string;                                     // ISO 8601 timestamp
}
```

### Example Output

```json
{
  "status": "in_progress",
  "confidence": 0.87,
  "progressPercent": 50,
  "taskMatch": true,
  "timestamp": "2024-12-01T10:30:00.000Z"
}
```

---

## 🎯 Confidence Levels

### Interpretation

```typescript
getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= 0.80) return 'high';   // Auto-approve eligible
  if (confidence >= 0.70) return 'medium'; // Manual review recommended
  return 'low';                            // Manual review required
}
```

### Auto-Approval Criteria

```typescript
isReliable(confidence: number, taskMatch: boolean): boolean {
  // Require both high confidence AND task match for auto-approval
  return confidence >= 0.70 && taskMatch;
}
```

### Display Colors

```typescript
function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.80) return '#4CAF50';  // Green
  if (confidence >= 0.70) return '#FF9800';  // Orange
  return '#F44336';                          // Red
}
```

---

## ⚠️ Error Handling

### Graceful Degradation

The CNN is **optional** - if it fails to load or predict, the app continues normally:

```typescript
try {
  await cnnStatusPredictor.initialize();
  setCnnInitialized(true);
} catch (error) {
  console.error('Failed to initialize CNN:', error);
  // Continue without CNN - it's optional
}
```

### Common Issues

1. **Model files not found**
   - Ensure `model_optimized.tflite` and `labels_improved.json` are in `android/app/src/main/assets/`

2. **tflite-react-native not available**
   - Metro bundler requires static `require()` - NOT dynamic module resolution
   - Fixed by using: `require('tflite-react-native')`

3. **Task not CNN-eligible**
   - Verify `task.cnnEligible = true` in UI
   - Verify `TaskAwareCNNModel.isCNNEligible(task.subTask)` returns true

4. **Low confidence predictions**
   - Flag for manual engineer review
   - Do not auto-approve below 70% confidence

---

## 🧪 Testing Checklist

### Before Deployment

- [ ] Create CNN-eligible task (concrete_pouring, chb_laying, roof_sheeting, tile_laying, or painting)
- [ ] Assign worker to task
- [ ] Worker takes photo of task in progress
- [ ] Verify CNN prediction appears in console logs
- [ ] Verify photo uploads successfully with CNN metadata
- [ ] Engineer sees CNN prediction in ReportLogsScreen
- [ ] Test with non-CNN-eligible task (should skip prediction gracefully)

### Expected Console Logs

```
[CNN] Model loaded successfully
[CNN] Running prediction for task: concrete_pouring
[CNN] Inference completed in 245ms
[CNN] Status Prediction: { status: 'in_progress', confidence: 0.87, ... }
```

---

## 📱 User Experience

### For Workers

- CNN prediction runs **automatically** when submitting photos
- **No action required** - completely transparent
- Upload continues even if CNN fails
- **Does not block** photo submission

### For Engineers

- See CNN predictions in **ReportLogsScreen**
- Confidence indicator helps prioritize reviews:
  - 🟢 Green (≥80%): High confidence
  - 🟠 Orange (70-79%): Medium confidence
  - 🔴 Red (<70%): Low confidence
- Can **approve or reject** regardless of CNN prediction
- CNN is advisory only - engineer has final say

---

## 🚀 Performance

- **Initialization**: ~1-2 seconds on app start
- **Inference**: ~200-500ms per photo
- **Model size**: ~8 MB (TFLite optimized)
- **Memory**: ~50 MB during inference
- **Battery impact**: Minimal (only runs on photo upload)

---

## 🔒 Privacy & Security

- All predictions run **on-device** (no cloud API)
- Photos uploaded to **Firebase Storage** (engineer's project)
- CNN predictions stored as **metadata** in Firestore
- No third-party AI services used

---

## 📝 Future Improvements

1. **Add more tasks**: Expand CNN to cover more construction activities
2. **Auto-approval**: Implement automatic task approval for high-confidence predictions
3. **Feedback loop**: Allow engineers to flag incorrect predictions for model retraining
4. **Progress tracking**: Track CNN accuracy over time per task type
5. **Worker guidance**: Show real-time predictions to workers before submission

---

## 💡 Troubleshooting

### CNN not running?

1. Check if task is CNN-eligible:
   ```typescript
   console.log('Task:', task.subTask, 'CNN Eligible:', task.cnnEligible);
   console.log('Is CNN Eligible:', TaskAwareCNNModel.isCNNEligible(task.subTask));
   ```

2. Check if CNN initialized:
   ```typescript
   console.log('CNN Initialized:', cnnInitialized);
   ```

3. Check console for errors:
   ```
   [CNN] Failed to load model: ...
   [CNN] Prediction failed: ...
   ```

### Prediction not showing in engineer screen?

1. Verify photo has `cnnPrediction` metadata in Firestore
2. Check `task_photos` collection for the photo document
3. Verify `ReportLogsScreen.tsx` is rendering CNN predictions

---

## 📞 Support

For issues related to CNN integration:
- Check console logs for `[CNN]` prefix
- Verify model files exist in assets folder
- Ensure task is in the CNN-eligible list
- Test with a different CNN-eligible task

---

**Last Updated**: December 1, 2024  
**Version**: 1.0.0  
**Model**: Task-Aware CNN (5 tasks × 3 statuses = 15 classes)

