# 🎨 SitePulse Icon & Splash Screen Setup

> **Completed:** October 17, 2025  
> **Platform:** Android & iOS  
> **Status:** ✅ Ready to Build

---

## 📋 What Was Done

### 1. **Android Adaptive Icon** 
✅ Configured adaptive icon with construction theme
- **File:** `./assets/adaptive-icon.png`
- **Background Color:** `#FF6B35` (Construction Orange)
- **Format:** Adaptive icon for Android 8.0+ (Material Design)

### 2. **Splash Screen (Both Platforms)**
✅ Black splash screen with light icon
- **File:** `./assets/splash-icon-light.png`
- **Background:** `#000000` (Black)
- **Resize Mode:** `contain` (centered, maintains aspect ratio)

### 3. **iOS Bundle ID**
✅ Added bundle identifier for iOS
- **Bundle ID:** `com.sitepulse.app`
- **iOS Splash:** Same as Android (black background)

---

## 🎨 Design Choices

### Color Scheme
```
🟠 Android Adaptive Icon Background: #FF6B35 (Construction Orange)
⬛ Splash Screen Background: #000000 (Professional Black)
💡 Splash Icon: Light version (white/light colors on black)
```

### Why These Colors?
- **Orange (#FF6B35):** Represents construction, caution, and safety
- **Black (#000000):** Professional, modern, sleek appearance
- **Light Icon:** High contrast on black background, easy to see

---

## 📱 How It Looks

### Android App Icon
```
┌─────────────────────┐
│                     │
│   [Your Icon]       │  ← Centered on orange background
│                     │  ← Android masks it to circle/rounded square
│                     │
└─────────────────────┘
     Orange BG
```

### Splash Screen (Both Platforms)
```
┌─────────────────────┐
│                     │
│                     │
│   [Light Icon]      │  ← Centered, white/light on black
│                     │
│                     │
└─────────────────────┘
     Black BG
```

---

## 📂 Files Modified

### app.json
```json
{
  "expo": {
    "splash": {
      "image": "./assets/splash-icon-light.png",  // Changed
      "backgroundColor": "#000000"                 // Changed
    },
    "ios": {
      "bundleIdentifier": "com.sitepulse.app",    // Added
      "splash": {
        "image": "./assets/splash-icon-light.png", // Added
        "backgroundColor": "#000000"                // Added
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png", // Changed
        "backgroundColor": "#FF6B35"                      // Changed
      }
    }
  }
}
```

---

## 🚀 How to Test

### Android
```bash
# Build development APK
eas build --platform android --profile preview

# Or run on emulator
npx expo run:android
```

**What to check:**
1. App icon on home screen → Orange background with your icon
2. Splash screen on app launch → Black with light icon

### iOS
```bash
# Build for iOS
eas build --platform ios --profile preview

# Or run on simulator
npx expo run:ios
```

**What to check:**
1. App icon on home screen → Your icon (iOS doesn't use background color)
2. Splash screen on app launch → Black with light icon

---

## 📐 Asset Requirements

### Current Assets (Already in place):
```
assets/
├── icon.png              ← Main app icon (1024x1024)
├── adaptive-icon.png     ← Android adaptive icon (1024x1024, centered)
├── splash.png            ← Old splash (not used anymore)
├── splash-icon-light.png ← NEW: Used for black splash screen ✅
├── splash-icon-dark.png  ← Available for white splash (not used)
└── favicon.png           ← Web favicon
```

### Image Specifications:

**icon.png**
- Size: 1024x1024 px
- Format: PNG with transparency
- Usage: Main app icon (iOS)

**adaptive-icon.png**
- Size: 1024x1024 px
- Format: PNG with transparency
- Safe Area: Center 66% (660x660 px circle)
- Usage: Android adaptive icon foreground

**splash-icon-light.png**
- Size: Recommended 1242x2436 px (can be smaller)
- Format: PNG with transparency
- Usage: Splash screen icon on black background

---

## 🎯 Android Adaptive Icon Guide

Android adaptive icons have two layers:
1. **Background Layer:** Solid color (#FF6B35)
2. **Foreground Layer:** Your icon (adaptive-icon.png)

**Safe Zone:**
```
┌───────────────────────────┐
│         1024 x 1024       │
│  ┌─────────────────────┐  │
│  │                     │  │
│  │    Safe Zone        │  │ ← Keep important content
│  │    660 x 660        │  │   inside this circle
│  │                     │  │
│  └─────────────────────┘  │
└───────────────────────────┘
```

Android will mask your icon into different shapes:
- Circle (most common)
- Rounded square
- Squircle (iOS-style)

---

## 🎨 Customization Options

### Want Different Colors?

**Option 1: Blue Theme (Construction Blueprint)**
```json
"backgroundColor": "#2196F3"  // Material Blue
```

**Option 2: Dark Gray (Professional)**
```json
"backgroundColor": "#37474F"  // Blue Gray
```

**Option 3: Yellow (Caution)**
```json
"backgroundColor": "#FFC107"  // Amber/Yellow
```

### Want White Splash Screen?
```json
"splash": {
  "image": "./assets/splash-icon-dark.png",
  "backgroundColor": "#FFFFFF"
}
```

---

## 🔧 Build Commands

### Development Build
```bash
# Android
npx expo run:android

# iOS
npx expo run:ios
```

### Production Build (EAS)
```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Configure project
eas build:configure

# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios

# Build for both
eas build --platform all
```

---

## 📱 Platform-Specific Notes

### Android
- ✅ Adaptive icon works on Android 8.0+ (API 26+)
- ✅ Older devices will use the regular icon.png
- ✅ Icon background color can be any hex color
- ✅ Icon automatically masks to different shapes

### iOS
- ✅ iOS doesn't use adaptive icons
- ✅ Uses the regular icon.png (1024x1024)
- ✅ iOS rounds the corners automatically
- ✅ Bundle ID required for App Store submissions

---

## ✅ Pre-Build Checklist

Before building your app, make sure:

- [ ] `adaptive-icon.png` exists in `assets/` folder
- [ ] Icon has transparent background
- [ ] Important content within center safe zone (66%)
- [ ] `splash-icon-light.png` exists and looks good on black
- [ ] Bundle ID is unique (`com.sitepulse.app`)
- [ ] Camera and storage permissions configured
- [ ] App name is correct ("SitePulse")

---

## 🎉 Summary

### What You Have Now:
✅ **Android Adaptive Icon** - Orange background, professional look  
✅ **Black Splash Screen** - Modern, sleek appearance  
✅ **iOS Splash Screen** - Consistent with Android  
✅ **Bundle IDs** - Ready for app stores  
✅ **Proper Asset Paths** - All configured correctly  

### Next Steps:
1. **Test on Emulator/Device** - Run `npx expo run:android`
2. **Adjust Colors if Needed** - Edit `app.json` backgroundColor
3. **Build APK/IPA** - Use EAS Build for distribution
4. **Submit to Stores** - Google Play & App Store

---

## 📞 Need Changes?

### Change Icon Background Color:
Edit `app.json` line 33:
```json
"backgroundColor": "#YOUR_COLOR_HERE"
```

### Change Splash Background:
Edit `app.json` lines 12 and 27:
```json
"backgroundColor": "#YOUR_COLOR_HERE"
```

### Use Different Splash Icon:
Edit `app.json` lines 10 and 25:
```json
"image": "./assets/YOUR_ICON.png"
```

---

**Your app icons and splash screen are now production-ready!** 🚀📱✨

**Colors Used:**
- 🟠 Android Icon: `#FF6B35` (Construction Orange)
- ⬛ Splash Screen: `#000000` (Black)

