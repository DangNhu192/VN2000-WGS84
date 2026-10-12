Write-Host "🧪 Running VN2000-PWA Automated Test Suite..." -ForegroundColor Cyan
node --test tests/*.test.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Verification failed!" -ForegroundColor Red
    exit 1
} else {
    Write-Host "✅ Verification passed! 100% tests successful." -ForegroundColor Green
    exit 0
}
