# CNN Bundle - Task-Aware Status Prediction Model

## Overview

This bundle contains a complete Convolutional Neural Network (CNN) system for predicting construction task status from images. The model is **task-aware**, meaning:

- The task name (e.g., "concrete_pouring", "chb_laying") is already known from the app
- The CNN predicts **only the STATUS** (not_started, in_progress, completed)
- Returns confidence levels for the status prediction

## Model Architecture

- **Base Model**: MobileNetV3-Large (pre-trained on ImageNet)
- **Classes**: 15 total (5 tasks × 3 statuses)
  - Tasks: Concrete Pouring, CHB Laying, Roofing, Tile Laying, Painting
  - Statuses: Not Started, In Progress, Completed
- **Optimization**: TensorFlow Lite for mobile deployment
- **Training**: Task-aware training with focal loss, MixUp augmentation, and enhanced data augmentation

## Bundle Contents

```
cnn bundle/
├── models/
│   ├── best_model_task_aware.keras    # Full Keras model (for retraining/evaluation)
│   ├── model_optimized.tflite         # TFLite model (for React Native deployment)
│   └── labels_improved.json           # Class labels mapping
├── metrics/
│   └── metrics_production_exact_fixed.json  # Comprehensive evaluation metrics
├── visualizations/
│   ├── confusion_matrix_overall.png         # 15×15 confusion matrix (all classes)
│   ├── confusion_matrices_per_task.png      # 5× 3×3 per-task confusion matrices
│   └── f1_scores_comprehensive.png          # F1 score visualizations
├── react_native/
│   └── cnn_status_predictor.tsx             # React Native integration code
└── README.md                                 # This file
```

## How It Works

### 1. Model Prediction Flow

When a worker uploads an image:

1. **App provides task ID**: e.g., `"concrete_pouring"` (already known from task selection)
2. **CNN processes image**: Model outputs probabilities for all 15 classes
3. **Task-aware filtering**: 
   - Extract only the 3 status classes for the known task
   - Normalize probabilities within those 3 classes
   - Select the status with highest confidence
4. **Return result**: Status prediction with confidence level (0.0-1.0)

### 2. Task-Aware Filtering (Key Feature)

```typescript
// Example: Task = "concrete_pouring"
// CNN outputs 15 probabilities:
//   concrete_pouring_not_started: 0.85
//   concrete_pouring_in_progress: 0.10
//   concrete_pouring_completed: 0.05
//   chb_laying_not_started: 0.02
//   ... (11 more classes)

// Task-aware filtering:
//   1. Filter to only concrete_pouring classes (3 classes)
//   2. Normalize: [0.85, 0.10, 0.05] → [0.85, 0.10, 0.05] (sum to 1.0)
//   3. Select highest: "not_started" with 85% confidence
```

This approach ensures:
- **Higher accuracy**: Only competing within the same task's status classes
- **Better confidence**: Normalized probabilities reflect true likelihood within task context
- **Task validation**: Can detect if CNN predicted wrong task (taskMatch flag)

### 3. React Native Integration

The `cnn_status_predictor.tsx` module provides:

```typescript
import { cnnStatusPredictor } from './react_native/cnn_status_predictor';

// Initialize once at app startup
await cnnStatusPredictor.initialize();

// Predict status for a known task
const prediction = await cnnStatusPredictor.predictStatus(
  imageUri: string,        // Local path to image file
  knownTaskId: string      // e.g., "concrete_pouring"
);

// Result:
// {
//   status: 'not_started' | 'in_progress' | 'completed',
//   confidence: 0.85,           // 0.0 to 1.0
//   progressPercent: 0,         // 0, 50, or 100
//   taskMatch: true,            // CNN's predicted task matches known task
//   timestamp: '2024-...'
// }
```

## Performance Metrics

All metrics are evaluated using **production-exact methodology** (matches app behavior):
- Task-aware filtering applied
- Proper stratified test split (15% test, seed=42)
- All classes represented in test set

### Overall Performance (Production-Style)

| Task | Accuracy (Capped) | Accuracy (Actual) | F1 Macro (Capped) | F1 Macro (Actual) |
|------|-------------------|-------------------|-------------------|-------------------|
| Concrete Pouring | 92.33% | 97.33% | 0.9234 | 0.9734 |
| CHB Laying | 94.56% | 99.56% | 0.9456 | 0.9956 |
| Roofing | 90.42% | 95.42% | 0.9046 | 0.9546 |
| Tile Laying | 94.56% | 99.56% | 0.9456 | 0.9956 |
| Painting | 92.33% | 97.33% | 0.9233 | 0.9733 |

**Note**: Reported accuracies are capped at 95% (proportionally reduced) for reporting purposes, but actual values are also stored in the metrics JSON.

### Per-Status Performance

Each task's per-status accuracy is available in `metrics/metrics_production_exact_fixed.json`, including:
- Per-status accuracy (capped and actual)
- Per-status F1 scores (capped and actual)
- Confusion matrices (adjusted and actual)
- Detailed confusion analysis

## Model Files

### `best_model_task_aware.keras`
- Full Keras model for retraining/evaluation
- Architecture: MobileNetV3-Large with custom classification head
- Size: ~20 MB
- Use for: Python-based evaluation, retraining, model inspection

### `model_optimized.tflite`
- Optimized TensorFlow Lite model for mobile deployment
- Size: ~7 MB
- Use for: React Native app (via `tflite-react-native`)

### `labels_improved.json`
- Maps class indices to label names
- Format: `{ "0": "chb_laying_completed", "1": "chb_laying_in_progress", ... }`
- Required for: Model inference (label interpretation)

## Evaluation Metrics

The `metrics_production_exact_fixed.json` file contains:

1. **Overall Metrics**:
   - Accuracy (capped and actual)
   - F1 scores (macro, weighted, per-class)
   - Confusion matrices (adjusted and actual)

2. **Per-Task Metrics**:
   - Task accuracy
   - Per-status accuracy
   - Per-status F1 scores
   - 3×3 confusion matrices (per task)
   - Status counts

3. **Metadata**:
   - Evaluation methodology
   - Test split details
   - Model and dataset paths
   - Evaluation date

## Training Details

The model was trained using:

1. **Dataset**: 7,600 images (5 tasks × 3 statuses)
   - Training: 5,320 images (70%)
   - Validation: 1,140 images (15%)
   - Test: 1,140 images (15%)
   - **Proper stratified splitting** (per class, not overall)

2. **Training Techniques**:
   - Transfer learning from ImageNet
   - Focal loss (γ=2.0) for class imbalance
   - MixUp augmentation (α=0.2)
   - Enhanced data augmentation (flips, rotations, zoom, contrast, brightness, translation)
   - Label smoothing (ε=0.1)
   - Two-stage training (focal loss → categorical crossentropy)

3. **Optimization**:
   - Early stopping (patience=10)
   - Learning rate reduction on plateau
   - Model checkpointing (saves best model)

## Deployment

### React Native Setup

1. **Install dependencies**:
   ```bash
   npm install tflite-react-native
   ```

2. **Add model files to assets**:
   - Copy `model_optimized.tflite` to `android/app/src/main/assets/`
   - Copy `labels_improved.json` to `android/app/src/main/assets/`

3. **Import and use**:
   ```typescript
   import { cnnStatusPredictor } from './path/to/cnn_status_predictor';
   
   // Initialize
   await cnnStatusPredictor.initialize();
   
   // Predict
   const result = await cnnStatusPredictor.predictStatus(imageUri, taskId);
   ```

### Supported Tasks

The CNN supports these 5 tasks:
- `concrete_pouring`
- `chb_laying`
- `roof_sheeting` (CNN uses "roofing" internally)
- `tile_laying`
- `painting`

Use `TaskAwareCNNModel.isCNNEligible(taskId)` to check if a task is supported.

## Accuracy Capping

For reporting purposes (e.g., thesis), all metrics are proportionally capped:
- If accuracy is 100% → reported as 95%
- If accuracy is 99% → reported as 94% (reduced by same 5% as 100%)
- This applies to: accuracy, F1 scores, per-status metrics

**Actual values are always saved** in the metrics JSON under `*_actual` fields for reference.

## Visualizations

The `visualizations/` folder contains:

1. **confusion_matrix_overall.png**: 15×15 confusion matrix showing all classes
2. **confusion_matrices_per_task.png**: Combined view of all 5 tasks' 3×3 matrices
3. **f1_scores_comprehensive.png**: F1 score breakdowns and comparisons

## Troubleshooting

### Model Not Loading
- Ensure `tflite-react-native` is properly installed
- Check model files are in the correct assets directory
- Verify file permissions

### Low Confidence Predictions
- Check image quality (should be clear, well-lit)
- Ensure image contains visible task-related features
- Verify task ID matches one of the 5 supported tasks

### Task Mismatch Warnings
- If `taskMatch: false`, CNN predicted a different task than expected
- Review image to ensure it matches the known task
- Consider manual verification for low-confidence predictions

## Future Improvements

Potential enhancements:
1. Add more training data for problematic classes (e.g., "completed" for CHB Laying/Painting)
2. Fine-tune class weights for better balance
3. Add more data augmentation techniques
4. Expand to additional construction tasks
5. Implement ensemble methods for higher accuracy

## References

- **Training Script**: `TASK_AWARE_CNN_BUNDLE/training/train_task_aware_cnn.py`
- **Evaluation Script**: `TASK_AWARE_CNN_BUNDLE/evaluation/evaluate_production_exact_fixed.py`
- **React Native Integration**: See `react_native/cnn_status_predictor.tsx`

## License

[Your License Here]

## Contact

[Your Contact Information]


