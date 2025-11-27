# 📦 SITEPULSE ML BUNDLE

**Complete AI/ML integration package for SITEPULSE Construction Management**

---

## 🎯 Quick Start

1. **Read the main guide first:**  
   📖 Open `AI_INTEGRATION_GUIDE.md` for complete documentation

2. **Copy model files to your React Native app:**
   ```bash
   cp models/* YourApp/assets/ml/
   ```

3. **Check the examples:**
   - `deployment/tflite_integration_example.tsx` - CNN integration code
   - `deployment/delay_prediction_cloud_function.js` - Backend API code

4. **Review performance:**
   - `documentation/` contains all evaluation metrics and visualizations

---

## 📁 Bundle Contents

```
SITEPULSE_ML_BUNDLE/
│
├── AI_INTEGRATION_GUIDE.md          ⭐ MAIN GUIDE - Read this first!
├── README.md                        ← You are here
│
├── models/                          📦 Required for deployment
│   ├── model_optimized.tflite       (~5-6 MB) CNN model
│   ├── labels_improved.json         (<1 KB) Class mappings
│   └── delay_model_weights.json     (~10 KB) Delay prediction weights
│
├── documentation/                   📊 Evaluation & metrics
│   ├── confusion_matrix_improved.png
│   ├── training_history_improved.png
│   ├── f1_scores.png
│   └── metrics_improved.json
│
└── deployment/                      💻 Integration examples
    ├── tflite_integration_example.tsx
    └── delay_prediction_cloud_function.js
```

---

## 🤖 What This Bundle Does

### **1. CNN Model (model_optimized.tflite)**
- Automatically classifies construction progress from photos
- Works for 5 activities: Concrete, CHB, Roofing, Tile, Painting
- Outputs: Not Started (0%), In Progress (50%), Completed (100%)
- Runs **on-device** (no internet required)

### **2. Delay Prediction Model (delay_model_weights.json)**
- Predicts task delays using linear regression
- Works for **ALL 75+ task types** in SITEPULSE
- Uses CNN-derived OR manual progress inputs
- Runs **server-side** (Firebase Cloud Function)

---

## ⚡ Quick Integration Steps

### **For Mobile App (React Native):**

1. Install TFLite:
   ```bash
   npm install tflite-react-native
   ```

2. Copy models to assets:
   ```bash
   cp models/*.tflite YourApp/assets/ml/
   cp models/*.json YourApp/assets/ml/
   ```

3. Use the example code:
   ```typescript
   // See: deployment/tflite_integration_example.tsx
   import Tflite from 'tflite-react-native';
   
   const tflite = new Tflite();
   await tflite.loadModel({
     model: 'model_optimized.tflite',
     labels: 'labels_improved.json',
   });
   
   const result = await tflite.runModelOnImage({
     path: imageUri,
     imageMean: 127.5,
     imageStd: 127.5,
   });
   ```

### **For Backend (Firebase):**

1. Copy to functions folder:
   ```bash
   cp models/delay_model_weights.json firebase/functions/
   cp deployment/delay_prediction_cloud_function.js firebase/functions/index.js
   ```

2. Deploy:
   ```bash
   firebase deploy --only functions
   ```

3. Call from app:
   ```typescript
   const result = await functions().httpsCallable('predictDelay')({
     taskId: '123',
     taskType: 'Concrete pouring',
     plannedDuration: 10,
     daysPassed: 5,
     progressPercent: 50, // From CNN or manual
     material_shortage: 0,
     equipment_breakdown: 0,
     weather_issue: 1,
     permit_issue: 0,
   });
   ```

---

## 📊 Model Performance

| Model | Metric | Value |
|-------|--------|-------|
| **CNN** | Accuracy | 82.3% |
| **CNN** | F1 Score | 0.80 |
| **CNN** | Model Size | ~6 MB |
| **Delay** | R² | 0.922 |
| **Delay** | MAE | 1.03 days |
| **Delay** | RMSE | 1.34 days |

---

## 🔄 Complete Workflow

```
1. Engineer creates task in SITEPULSE
   ↓
2. Worker receives task assignment
   ↓
3. For CNN-eligible tasks:
   - Worker takes photo
   - CNN predicts stage (86% confidence)
   - Auto-calculates progress = 50%
   
   For non-CNN tasks:
   - Worker manually slides progress bar
   - Progress = manual input
   ↓
4. Engineer verifies and approves
   ↓
5. Data saved to Firestore
   ↓
6. Delay prediction API called
   - Receives progress (CNN or manual)
   - Predicts delay: 2 days, Medium risk
   ↓
7. Dashboard displays:
   - 📊 Progress timeline
   - ⚠️ Delay warnings
   - 🧠 AI predictions
```

---

## ✅ Checklist Before Integration

- [ ] Read `AI_INTEGRATION_GUIDE.md` completely
- [ ] Understand CNN vs delay prediction roles
- [ ] Review example code in `deployment/`
- [ ] Check documentation visualizations
- [ ] Test with sample images first
- [ ] Set up Firebase Cloud Functions
- [ ] Configure error handling
- [ ] Plan for model updates

---

## 📞 Need Help?

1. **Full documentation**: Open `AI_INTEGRATION_GUIDE.md`
2. **Code examples**: Check `deployment/` folder
3. **Performance data**: Review `documentation/` folder
4. **Training scripts**: See parent directory

---

## 📄 License

**Trained for:** SITEPULSE Construction Management System  
**Date:** November 27, 2025  
**Framework:** TensorFlow 2.13+  
**Architecture:** MobileNetV3-Large (Apache 2.0 License)

---

**🚀 Ready to integrate AI into SITEPULSE!**

Start with `AI_INTEGRATION_GUIDE.md` → Review examples → Deploy → Test → Launch! 🎉

