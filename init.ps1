Write-Host "🧪 Running VN2000-PWA Automated Test Suite..." -ForegroundColor Cyan
$nodeCmd = "node"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    if (Test-Path "C:\Users\User\AppData\Local\hermes\tools\node-26.12.1-win32-x64\node.exe") {
        $nodeCmd = "C:\Users\User\AppData\Local\hermes\tools\node-26.12.1-win32-x64\node.exe"
    }
}
& $nodeCmd --test tests/*.test.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Verification failed!" -ForegroundColor Red
    exit 1
} else {
    Write-Host "✅ Verification passed! 100% tests successful." -ForegroundColor Green
    exit 0
}
