# 📱 Android Development Setup Guide

> **Quick Start or Full Setup?**  
> Choose based on your needs

---

## 🚀 Option 1: Expo Go (Quick - 2 minutes)

**Best for:** Testing on real device, no installation needed

### Steps:
1. **Install Expo Go on Android phone**
   - Google Play Store → Search "Expo Go" → Install

2. **Start dev server on PC**
   ```bash
   npm start
   ```

3. **Scan QR code**
   - Open Expo Go app
   - Tap "Scan QR Code"
   - Scan the QR from your terminal
   - Done! 🎉

**Pros:**
- ✅ No Android Studio needed
- ✅ Works in 2 minutes
- ✅ Real device testing
- ✅ Hot reload

**Cons:**
- ❌ Can't build standalone APK
- ❌ Requires internet connection
- ❌ Some native modules won't work

---

## 🛠️ Option 2: Android Studio (Full Setup - 60 minutes)

**Best for:** Building APKs, using emulator, production development

### Step 1: Download & Install Android Studio
1. Go to: https://developer.android.com/studio
2. Download Android Studio (1-2 GB)
3. Run installer
4. During setup, select:
   - ✅ Android SDK
   - ✅ Android SDK Platform-Tools
   - ✅ Android Virtual Device (AVD)
5. Wait for installation (10-15 minutes)

### Step 2: Set Environment Variables

**Windows (Method 1 - PowerShell as Admin):**
```powershell
# Set ANDROID_HOME
[System.Environment]::SetEnvironmentVariable("ANDROID_HOME", "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk", "User")

# Add to PATH
$currentPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
$androidPath = "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk\platform-tools;C:\Users\$env:USERNAME\AppData\Local\Android\Sdk\tools"
[System.Environment]::SetEnvironmentVariable("Path", "$currentPath;$androidPath", "User")
```

**Windows (Method 2 - Manual):**
1. Press `Win + R` → Type `sysdm.cpl` → Enter
2. Click "Advanced" tab → "Environment Variables"
3. Under "User variables", click "New":
   - Variable name: `ANDROID_HOME`
   - Variable value: `C:\Users\Administrator\AppData\Local\Android\Sdk`
4. Select "Path" → Click "Edit" → Click "New" → Add:
   - `C:\Users\Administrator\AppData\Local\Android\Sdk\platform-tools`
   - `C:\Users\Administrator\AppData\Local\Android\Sdk\tools`
5. Click OK on all windows

### Step 3: Restart Terminal
**Important:** Close ALL terminal windows and reopen

### Step 4: Verify Installation
```bash
# Check ADB
adb --version
# Should show: Android Debug Bridge version X.X.X

# Check Android SDK
echo %ANDROID_HOME%
# Should show: C:\Users\Administrator\AppData\Local\Android\Sdk
```

### Step 5: Accept Licenses
```bash
cd %ANDROID_HOME%\tools\bin
sdkmanager --licenses
# Type 'y' for each license
```

### Step 6: Create Virtual Device (Emulator)
1. Open Android Studio
2. Click "More Actions" → "Virtual Device Manager"
3. Click "Create Device"
4. Select "Pixel 5" → Next
5. Select "R" (Android 11) → Download if needed → Next
6. Click "Finish"
7. Click "Play" button to start emulator

### Step 7: Run Your App
```bash
# Make sure emulator is running
npx expo run:android
```

**Pros:**
- ✅ Full development environment
- ✅ Build standalone APKs
- ✅ Use emulator
- ✅ All native modules work
- ✅ Production-ready

**Cons:**
- ❌ Takes time to set up
- ❌ Large download (~4GB)
- ❌ Requires powerful PC

---

## ☁️ Option 3: EAS Build (Cloud Build - 5 minutes setup)

**Best for:** Building APKs without Android Studio

### Step 1: Install EAS CLI
```bash
npm install -g eas-cli
```

### Step 2: Login to Expo
```bash
eas login
```
Enter your Expo account credentials (create free account if needed)

### Step 3: Configure Project
```bash
eas build:configure
```
This creates `eas.json` configuration file

### Step 4: Build APK
```bash
# Build for Android
eas build --platform android --profile preview
```

### Step 5: Wait & Download
- Build runs in the cloud (10-15 minutes)
- You'll get a link to download APK
- Install APK on your phone

**Pros:**
- ✅ No Android Studio needed
- ✅ Build on any computer
- ✅ Production-quality APKs
- ✅ Easy to share

**Cons:**
- ❌ Requires Expo account
- ❌ Builds can take time
- ❌ Internet required

---

## 🎯 Recommended Workflow

### For Development:
```
Option 1 (Expo Go) → Quick testing on real device
Option 2 (Android Studio) → Full development & debugging
```

### For Production:
```
Option 3 (EAS Build) → Build APK for distribution
```

---

## 🐛 Troubleshooting

### Problem: `adb not recognized`
**Solution:**
- Make sure ANDROID_HOME is set correctly
- Restart terminal after setting environment variables
- Check PATH includes `platform-tools` folder

### Problem: `Android SDK not found`
**Solution:**
```bash
# Verify SDK location exists
dir C:\Users\Administrator\AppData\Local\Android\Sdk
```
If not found, reinstall Android Studio

### Problem: `Build failed: SDK license not accepted`
**Solution:**
```bash
cd %ANDROID_HOME%\tools\bin
sdkmanager --licenses
```
Type 'y' for all

### Problem: Emulator won't start
**Solution:**
- Enable virtualization in BIOS (VT-x / AMD-V)
- Install Intel HAXM (if Intel processor)
- Try ARM-based system image instead

### Problem: `Expo Go can't connect`
**Solution:**
- Make sure phone and PC on same WiFi
- Disable firewall temporarily
- Try tunnel: `npm start -- --tunnel`

---

## 📊 Comparison Table

| Feature | Expo Go | Android Studio | EAS Build |
|---------|---------|----------------|-----------|
| **Setup Time** | 2 min | 60 min | 5 min |
| **Build APK** | ❌ | ✅ | ✅ |
| **Emulator** | ❌ | ✅ | ❌ |
| **Real Device** | ✅ | ✅ | ✅ |
| **Offline Work** | ❌ | ✅ | ❌ |
| **Storage Needed** | 50 MB | 4+ GB | 50 MB |
| **Best For** | Quick testing | Full dev | Production |

---

## 🎓 Next Steps After Setup

### 1. Test Your Icons
- See adaptive icon with orange background
- See black splash screen with light icon

### 2. Test Core Features
- Login/SignUp
- Create project
- Add tasks
- Upload photos
- Export PDF

### 3. Build for Production
```bash
# Production build
eas build --platform android --profile production
```

### 4. Publish to Google Play
- Create Google Play Developer account ($25)
- Upload APK
- Fill in app details
- Submit for review

---

## 📱 Quick Commands Reference

```bash
# Start development server
npm start

# Run on Android (requires Android Studio)
npx expo run:android

# Build APK (cloud)
eas build --platform android

# Check ADB
adb devices

# Check environment
echo %ANDROID_HOME%

# Kill Metro bundler
npx react-native stop
```

---

## 🎉 You're Ready!

Choose your option and start testing your SitePulse app! 🏗️✨

**My recommendation for you right now:**
👉 Use **Option 1 (Expo Go)** to see your icons immediately!

Just run:
```bash
npm start
```
Then scan QR code with Expo Go app on your phone!

