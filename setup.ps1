# SitePulse Development Environment Setup
Write-Host "🏗️  SitePulse Construction Monitoring App" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Ensure Node.js is in PATH for this session
$env:PATH += ";C:\Program Files\nodejs"

# Test if Node.js is available
try {
    $nodeVersion = node --version
    $npmVersion = npm --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
    Write-Host "✅ npm: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Available commands:" -ForegroundColor Yellow
Write-Host "  npm install      - Install dependencies" -ForegroundColor White
Write-Host "  npm run web      - Start web development server" -ForegroundColor White
Write-Host "  npm run android  - Start Android development" -ForegroundColor White
Write-Host "  npm run ios      - Start iOS development" -ForegroundColor White
Write-Host ""

# Quick start option
$start = Read-Host "Would you like to start the web development server now? (y/n)"
if ($start -eq "y" -or $start -eq "Y") {
    Write-Host "🚀 Starting SitePulse web server..." -ForegroundColor Green
    npm run web
}


















































