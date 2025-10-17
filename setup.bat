@echo off
echo Setting up SitePulse development environment...
set PATH=%PATH%;C:\Program Files\nodejs
echo Node.js added to PATH for this session
echo.
echo Available commands:
echo   npm install          - Install dependencies
echo   npm run web          - Start web development server
echo   npm run android      - Start Android development
echo   npm run ios          - Start iOS development
echo.
echo Opening PowerShell with proper environment...
powershell -NoExit -Command "cd '%~dp0'; Write-Host 'SitePulse environment ready!' -ForegroundColor Green"














