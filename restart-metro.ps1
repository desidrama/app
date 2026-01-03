# Script to restart Metro bundler with cleared cache
Write-Host "Clearing Metro cache..." -ForegroundColor Yellow

# Clear Metro cache
Remove-Item -Path "$env:TEMP\metro-*" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$env:TEMP\haste-map-*" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path ".\.expo" -Recurse -Force -ErrorAction SilentlyContinue
if (Test-Path "node_modules\.cache") {
    Remove-Item -Path "node_modules\.cache" -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "Cache cleared! Starting Metro bundler..." -ForegroundColor Green
npx expo start --clear

