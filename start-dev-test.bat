@echo off
REM SitePulse - Local Development Testing Script
REM This starts Metro bundler for quick testing without building

echo.
echo ================================
echo   SitePulse - Dev Mode Testing
echo ================================
echo.
echo Starting Metro bundler...
echo Press Ctrl+C to stop
echo.
echo Once started:
echo 1. Scan QR code with Expo Go app
echo 2. Test CNN functionality live
echo 3. Check Metro console for CNN logs
echo.

npm start

