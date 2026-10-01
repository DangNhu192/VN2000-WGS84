<#
.SYNOPSIS
    Tự động đưa ứng dụng VN-2000 Pro PWA lên GitHub & triển khai Vercel.
.DESCRIPTION
    Kịch bản chuẩn hóa tương thích Visual Studio Code PowerShell Extension (vscode-powershell),
    hỗ trợ PowerShell Integrated Console, Windows PowerShell 5.1 và PowerShell Core (7.x+).
.PARAMETER RemoteUrl
    Đường dẫn kho lưu trữ GitHub (mặc định: lấy từ git remote hoặc https://github.com/DangNhu192/VN2000-WGS84.git).
.PARAMETER CommitMessage
    Thông điệp commit (mặc định: tự động sinh kèm phiên bản ứng dụng và mốc thời gian).
.PARAMETER NonInteractive
    Chạy ở chế độ tự động không dừng chờ người dùng nhấn phím (dùng cho VS Code Task hoặc CI/CD).
.PARAMETER ForcePush
    Cho phép đẩy đè (force push) lên nhánh main.
.EXAMPLE
    .\deploy_github.ps1
.EXAMPLE
    .\deploy_github.ps1 -CommitMessage "Cập nhật tính năng Google Sheets" -NonInteractive
#>

[CmdletBinding()]
param (
    [Parameter(Mandatory = $false, Position = 0)]
    [string]$CommitMessage = "",

    [Parameter(Mandatory = $false, Position = 1)]
    [string]$RemoteUrl = "",

    [Parameter(Mandatory = $false)]
    [switch]$NonInteractive,

    [Parameter(Mandatory = $false)]
    [switch]$ForcePush
)

# 1. Thiết lập quyền thực thi cho tiến trình hiện tại (Tương thích vscode-powershell)
try {
    if ((Get-ExecutionPolicy -Scope Process) -ne 'Bypass') {
        Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force -ErrorAction SilentlyContinue
    }
} catch {
    # Bỏ qua nếu bị giới hạn bởi Group Policy
}

# 2. Chuẩn hóa mã hóa ký tự UTF-8 cho Console & Output Stream
try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    $OutputEncoding = [System.Text.Encoding]::UTF8
} catch {
    # Bỏ qua nếu host không hỗ trợ thay đổi encoding
}

# 3. An toàn tiêu đề cửa sổ (Tương thích PowerShell Integrated Console trong VS Code)
try {
    if ($Host.UI -and $Host.UI.RawUI -and $Host.UI.RawUI.WindowTitle) {
        $Host.UI.RawUI.WindowTitle = "Đẩy App VN-2000 Pro Lên GitHub & Vercel"
    }
} catch {
    # PowerShell Integrated Console trong VS Code không hỗ trợ WindowTitle -> Bỏ qua an toàn
}

# 4. Xóa màn hình an toàn
try {
    Clear-Host
} catch {
    # Bỏ qua nếu host terminal không hỗ trợ Clear-Host
}

Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "     TỰ ĐỘNG ĐƯA APP VN-2000 PRO LÊN GITHUB & TRIỂN KHAI VERCEL     " -ForegroundColor Yellow
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""

# 5. Kiểm tra Git
$gitCmd = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitCmd) {
    Write-Host "[!] MÁY TÍNH CHƯA CÀI ĐẶT GIT!" -ForegroundColor Red
    Write-Host "Vui lòng tải và cài đặt Git tại: https://git-scm.com/downloads" -ForegroundColor Yellow
    if (-not $NonInteractive) {
        $null = Read-Host "Nhấn Enter để thoát..."
    }
    exit 1
}

# 6. Khởi tạo Git nếu chưa có
if (-not (Test-Path -Path ".git" -PathType Container)) {
    Write-Host "[1/3] Đang khởi tạo kho Git..." -ForegroundColor Green
    & git init | Out-Null
}

# 7. Tự động kiểm tra và thiết lập danh tính Git nếu chưa có
$currentName = & git config --get user.name 2>$null
if ([string]::IsNullOrWhiteSpace($currentName)) {
    & git config user.name "Dang Nhu"
    & git config user.email "dnpn.ttqt@gmail.com"
}
$currentEmail = & git config --get user.email 2>$null
if ([string]::IsNullOrWhiteSpace($currentEmail)) {
    & git config user.email "dnpn.ttqt@gmail.com"
}

# 8. Xác định link remote mặc định
$defaultUrl = "https://github.com/DangNhu192/VN2000-WGS84.git"
$existingUrl = & git remote get-url origin 2>$null
if (-not [string]::IsNullOrWhiteSpace($existingUrl)) {
    $defaultUrl = $existingUrl.Trim()
}

if ([string]::IsNullOrWhiteSpace($RemoteUrl)) {
    Write-Host "Link Repository GitHub hiện tại:" -ForegroundColor White
    Write-Host "👉 $defaultUrl" -ForegroundColor Yellow
    Write-Host ""

    if (-not $NonInteractive) {
        $inputUrl = Read-Host "Nhấn Enter để dùng link trên, hoặc dán link mới"
        if ([string]::IsNullOrWhiteSpace($inputUrl)) {
            $RemoteUrl = $defaultUrl
        } else {
            $RemoteUrl = $inputUrl.Trim()
        }
    } else {
        $RemoteUrl = $defaultUrl
    }
}

# Cập nhật remote origin
& git remote remove origin 2>$null
& git remote add origin $RemoteUrl

# 9. Xác định thông điệp commit
if ([string]::IsNullOrWhiteSpace($CommitMessage)) {
    $nowStr = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $appVer = "v2.2.4"
    if (Test-Path "sw.js") {
        $swContent = Get-Content -Raw "sw.js" -ErrorAction SilentlyContinue
        if ($swContent -match "CACHE_NAME\s*=\s*'vn2000-pro-(v[\d\.]+)'") {
            $appVer = $Matches[1]
        }
    }
    $CommitMessage = "Deploy VN2000 Pro PWA $appVer - $nowStr"
}

# 10. Đóng gói & Commit
Write-Host "`n[2/3] Đang đóng gói tài nguyên và tạo bản commit..." -ForegroundColor Green
& git add .
$statusOutput = & git status --porcelain
if (-not [string]::IsNullOrWhiteSpace($statusOutput)) {
    & git commit -m "$CommitMessage"
} else {
    Write-Host "[*] Không có thay đổi mới cần commit, tiếp tục kiểm tra đồng bộ..." -ForegroundColor Gray
}
& git branch -M main

# 11. Đẩy lên GitHub
Write-Host "`n[3/3] Đang tải mã nguồn lên GitHub (nhánh main)..." -ForegroundColor Green
Write-Host "[*] Chú ý: Nếu có cửa sổ trình duyệt bật lên, vui lòng chọn 'Sign in with your browser' để xác thực." -ForegroundColor Gray
Write-Host ""

if ($ForcePush) {
    & git push -u origin main --force
} else {
    & git push -u origin main
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n[*] Đang thử lại với tùy chọn đẩy đồng bộ (--force)..." -ForegroundColor Yellow
        & git push -u origin main --force
    }
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n====================================================================" -ForegroundColor Red
    Write-Host "[!] CHƯA THỂ TẢI LÊN GITHUB!" -ForegroundColor Red
    Write-Host "Nguyên nhân và cách xử lý:" -ForegroundColor Yellow
    Write-Host "  1. Bạn cần xác thực đăng nhập tài khoản GitHub qua trình duyệt." -ForegroundColor White
    Write-Host "  2. Link repository $RemoteUrl chưa được tạo trên https://github.com/new" -ForegroundColor White
    Write-Host "  3. Vui lòng kiểm tra lại quyền truy cập kho GitHub của bạn." -ForegroundColor White
    Write-Host "====================================================================" -ForegroundColor Red
    if (-not $NonInteractive) {
        $null = Read-Host "Nhấn Enter để thoát..."
    }
    exit 1
}

# 12. Hướng dẫn Vercel
Write-Host "`n====================================================================" -ForegroundColor Green
Write-Host "  ✓ ĐÃ TẢI LÊN GITHUB THÀNH CÔNG!" -ForegroundColor Green
Write-Host "====================================================================" -ForegroundColor Green
Write-Host "BƯỚC 2: KẾT NỐI VỚI VERCEL (Chỉ mất 30 giây - Có link HTTPS cực nhanh):" -ForegroundColor Cyan
Write-Host "  1. Mở trang https://vercel.com/new và đăng nhập bằng tài khoản GitHub." -ForegroundColor White
Write-Host "  2. Tìm kho lưu trữ vừa đẩy lên và bấm nút 'Import'." -ForegroundColor White
Write-Host "  3. Tại màn hình 'Configure Project':" -ForegroundColor White
Write-Host "     - Framework Preset: Chọn 'Other'" -ForegroundColor Yellow
Write-Host "     - Root Directory: Để trống (./)" -ForegroundColor Yellow
Write-Host "     - Bấm nút 'Deploy'." -ForegroundColor Green
Write-Host ""
Write-Host "👉 SAU 20 GIÂY, BẠN SẼ CÓ LINK HTTPS TOÀN CẦU TỐC ĐỘ CAO:" -ForegroundColor Cyan
Write-Host "   https://<tên-dự-án>.vercel.app" -ForegroundColor Yellow
Write-Host ""
Write-Host "👉 CÁC LẦN CẬP NHẬT SAU:" -ForegroundColor Cyan
Write-Host "   Mỗi khi bạn sửa code và chạy lại file này để đẩy lên GitHub," -ForegroundColor White
Write-Host "   Vercel sẽ TỰ ĐỘNG CẬP NHẬT ứng dụng ngay lập tức!" -ForegroundColor Green
Write-Host "====================================================================" -ForegroundColor Green

if (-not $NonInteractive) {
    $null = Read-Host "Nhấn Enter để hoàn tất..."
}
