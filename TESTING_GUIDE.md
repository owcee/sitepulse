# 🧪 Testing Guide - SitePulse CNN

## 🚀 Two Ways to Test

### Option 1: Quick Test (No Build Required) ⚡

Run the local test script to verify CNN logic:

```bash
node test-cnn-local.js
```

**What it tests:**
- ✅ CNN-eligible task configuration
- ✅ Task-to-CNN activity mapping
- ✅ Label parsing logic
- ✅ Model label verification
- ✅ Complete workflow simulation

**Time:** ~1 second  
**Use when:** Verifying logic changes, quick checks

---

### Option 2: Live Development Testing 📱

⚠️ **IMPORTANT: CNN DOES NOT WORK IN EXPO GO!**

**Expo Go Limitations:**
- ❌ Cannot test CNN (tflite-react-native requires native modules)
- ✅ Can test UI/UX (navigation, styling, forms)
- ✅ Can test basic functionality (login, task creation, etc.)
- ❌ Photo uploads with CNN prediction will fail gracefully

**To test CNN, you MUST build APK:**
```bash
npx eas-cli build --platform android --profile preview
```

**Expo Go is useful for:**
- Testing non-CNN screens (login, dashboard, reports)
- Testing UI layout and styling
- Quick iteration on non-native features
- Testing navigation flow

**Time:** ~30 seconds to start, instant reload on code changes  
**Use when:** Testing UI changes WITHOUT CNN functionality

**⚠️ Note:** For full CNN testing, skip to Option 3 (Full Build).

---

### Option 3: Full Build Testing 📦

Build APK for production testing:

```bash
npx eas-cli build --platform android --profile preview
```

**Time:** ~5-10 minutes  
**Use when:** Final testing before release, testing on multiple devices

---

## 📋 Complete Testing Checklist

### 1. Configuration Test (Local)

```bash
node test-cnn-local.js
```

**Expected output:**
```
🧪 ===== CNN LOCAL TESTING =====

✅ CNN-Eligible Tasks:
   ✓ concrete_pouring   → concrete_pouring
   ✓ chb_laying         → chb_laying
   ✓ roof_sheeting      → roofing
   ✓ tile_laying        → tile_laying
   ✓ painting           → painting

❌ Non-CNN-Eligible Tasks:
   ✓ plastering         → Correctly rejected
   ✓ excavation         → Correctly rejected

✨ All tests completed successfully!
```

---

### 2. ~~Development Test (Expo Go)~~ ❌ NOT RECOMMENDED

⚠️ **Skip this - CNN doesn't work in Expo Go!**

**Why?**
- tflite-react-native requires native modules
- Expo Go only supports managed/JS-only libraries
- CNN initialization will fail
- Photo uploads will work but without CNN predictions

**What you CAN test in Expo Go:**
- ✅ UI/UX (screens, navigation, styling)
- ✅ Login/authentication
- ✅ Task creation (non-CNN tasks)
- ✅ Dashboard and reports
- ❌ CNN predictions (will fail gracefully)

**For CNN testing, go straight to Option 3 (Full Build).**

---

### 3. Full Build Test (APK)

1. **Build:**
   ```bash
   npx eas-cli build --platform android --profile preview
   ```

2. **Install APK on device**

3. **Test complete workflow** (same as above)

4. **Check logs:**
   ```bash
   adb logcat | grep CNN
   ```

---

## 🎯 What to Test

### CNN Initialization
- [ ] App starts without crashing
- [ ] Console shows: `[CNN] Model loaded successfully`
- [ ] No errors about missing model files

### CNN-Eligible Tasks
- [ ] Create task: "Concrete pouring" → Shows "AI verification" note
- [ ] Create task: "CHB laying" → Shows "AI verification" note
- [ ] Create task: "Roof sheeting" → Shows "AI verification" note
- [ ] Create task: "Tile laying" → Shows "AI verification" note
- [ ] Create task: "Painting" → Shows "AI verification" note

### Non-CNN Tasks
- [ ] Create task: "Plastering" → NO "AI verification" note
- [ ] Create task: "Excavation" → NO "AI verification" note
- [ ] Upload photo → CNN does NOT run
- [ ] Photo uploads successfully without CNN

### CNN Prediction (CNN-Eligible Task)
- [ ] Worker takes photo
- [ ] Worker submits photo
- [ ] Console shows: `[CNN] Running prediction...`
- [ ] Console shows: `[CNN] Inference completed in XXXms`
- [ ] Console shows: `[CNN] Status Prediction: { ... }`

### Worker UI Display
- [ ] CNN prediction box appears below upload button
- [ ] Shows predicted status (Not Started / In Progress / Completed)
- [ ] Shows confidence percentage (e.g., "84%")
- [ ] Shows color-coded confidence:
  - 🟢 Green (≥80%)
  - 🟠 Orange (70-79%)
  - 🔴 Red (<70%)
- [ ] Shows progress bar filled to confidence level
- [ ] Shows estimated progress (0% / 50% / 100%)
- [ ] Shows info note: "AI prediction submitted to engineer"

### Engineer Review
- [ ] Engineer opens ReportLogsScreen
- [ ] Sees worker photo submission
- [ ] Sees CNN prediction with confidence
- [ ] Can approve/reject regardless of CNN

### Error Handling
- [ ] If CNN fails → Photo still uploads
- [ ] If model missing → App continues without CNN
- [ ] If prediction fails → Shows graceful error

---

## 🐛 Troubleshooting

### CNN Not Running?

1. **Check task is CNN-eligible:**
   ```javascript
   console.log('Task:', task.subTask, 'CNN Eligible:', task.cnnEligible);
   ```

2. **Check CNN initialized:**
   ```javascript
   console.log('CNN Initialized:', cnnInitialized);
   ```

3. **Check model files exist:**
   - `android/app/src/main/assets/model_optimized.tflite`
   - `android/app/src/main/assets/labels_improved.json`

### Prediction Not Showing in UI?

1. **Check Firestore:**
   - Open Firebase Console
   - Go to `task_photos` collection
   - Find latest photo document
   - Verify `cnnPrediction` field exists

2. **Check photo loaded:**
   ```javascript
   console.log('Latest Photo:', latestPhoto);
   console.log('Has CNN Prediction:', !!latestPhoto?.cnnPrediction);
   ```

### Metro Bundler Issues?

```bash
# Clear cache and restart
npx expo start -c
```

---

## ⏱️ Testing Time Estimates

| Method | Time | When to Use | CNN Support |
|--------|------|-------------|-------------|
| Local Script | 1 second | Quick logic verification | ✅ Configuration only |
| Expo Go Dev | 30 seconds | UI testing, rapid iteration | ❌ **NO - Native modules required** |
| Full Build | 5-10 minutes | CNN testing, production check | ✅ **YES - Full support** |

---

## 💡 Pro Tips

1. **⚠️ DON'T use Expo Go for CNN testing:**
   - CNN requires native modules
   - tflite-react-native won't load in Expo Go
   - You'll waste time debugging why it doesn't work

2. **Use local script for logic verification:**
   - Verify mappings instantly
   - No device needed
   - Run after every config change
   - Command: `node test-cnn-local.js`

3. **Build APK for CNN testing:**
   - **REQUIRED** for testing CNN functionality
   - Takes 5-10 minutes but necessary
   - EAS Build handles everything
   - Command: `npx eas-cli build --platform android --profile preview`

4. **Use Expo Go only for:**
   - Non-CNN screens (login, dashboard, reports)
   - UI/UX iteration
   - Navigation testing
   - Basic functionality

5. **Check console logs:**
   - Metro console (Expo Go - no CNN logs)
   - `adb logcat` (APK - full CNN logs)
   - Browser DevTools (web)

---

## 📊 Expected Console Output

### Successful CNN Run:
```
[CNN] Model loaded successfully
Worker takes photo...
Worker submits photo...
[CNN] Running prediction for task: concrete_pouring
[CNN] Inference completed in 245ms
[CNN] Status Prediction: {
  status: 'in_progress',
  confidence: 0.84,
  progressPercent: 50,
  taskMatch: true,
  timestamp: '2024-12-01T10:30:00.000Z'
}
🚀 Uploading task photo (REST API method)...
Task photo upload: 100.0%
✅ Task photo uploaded successfully!
Notification sent to engineer
```

### CNN Skipped (Non-Eligible Task):
```
Worker takes photo...
Worker submits photo...
🚀 Uploading task photo (REST API method)...
Task photo upload: 100.0%
✅ Task photo uploaded successfully!
(No CNN logs - working as expected)
```

---

## 🎉 Success Criteria

✅ All tests pass:
- Configuration test passes
- CNN runs for eligible tasks
- CNN skips for non-eligible tasks
- Worker sees prediction in UI
- Engineer sees prediction in reports
- No crashes or errors

---

**Happy Testing!** 🚀

For issues, check:
- `CNN_INTEGRATION_GUIDE.md` - Technical details
- `CNN_FIXES_SUMMARY.md` - What was fixed
- `CNN_WORKFLOW_COMPLETE.md` - Complete workflow

---

Last Updated: December 1, 2024

