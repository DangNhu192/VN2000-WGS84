# clean-system.ps1 - Cong cu don dep tien trinh ngam & giai phong tai nguyen cho Antigravity & VN2000-PWA
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " [CLEAN] DANG QUET VA DON DEP TIEN TRINH NGAM GAY NGHEN MANG & DUNG MAY" -ForegroundColor Yellow
Write-Host "=================================================================" -ForegroundColor Cyan

$killedCount = 0

# 1. Quet va tat tien trinh Chrome mo coi cua chrome-devtools-mcp
$chromeProcesses = Get-CimInstance Win32_Process -Filter "Name = 'chrome.exe'" -ErrorAction SilentlyContinue | 
    Where-Object { $_.CommandLine -like "*chrome-devtools-mcp*" }

if ($chromeProcesses) {
    foreach ($proc in $chromeProcesses) {
        Write-Host "  [-] Don dep Chrome DevTools mo coi (PID: $($proc.ProcessId))..." -ForegroundColor Red
        Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue
        $killedCount++
    }
} else {
    Write-Host "  [OK] Khong co tien trinh Chrome DevTools mo coi." -ForegroundColor Green
}

# 2. Quet va tat tien trinh Node mo coi cua chrome-devtools-mcp / npx treo
$nodeProcesses = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue | 
    Where-Object { $_.CommandLine -like "*chrome-devtools-mcp*" }

if ($nodeProcesses) {
    foreach ($proc in $nodeProcesses) {
        Write-Host "  [-] Don dep Node MCP mo coi (PID: $($proc.ProcessId))..." -ForegroundColor Red
        Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue
        $killedCount++
    }
} else {
    Write-Host "  [OK] Khong co tien trinh Node MCP mo coi." -ForegroundColor Green
}

Write-Host "-----------------------------------------------------------------" -ForegroundColor Gray
Write-Host "  [DONE] Da don dep $killedCount tien trinh zombie ngam." -ForegroundColor Green
Write-Host "  He thong da duoc giai phong RAM, CPU va tra lai bang thong mang!" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
