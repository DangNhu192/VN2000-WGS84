# ====================================================================
#     TỰ ĐỘNG ĐƯA APP VN-2000 PRO LÊN GITHUB & TRIỂN KHAI VERCEL
# ====================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "Đẩy App VN-2000 Pro Lên GitHub & Vercel"

Clear-Host
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "     TỰ ĐỘNG ĐƯA APP VN-2000 PRO LÊN GITHUB & TRIỂN KHAI VERCEL     " -ForegroundColor Yellow
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Kiểm tra Git
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "[!] MÁY TÍNH CHƯA CÀI ĐẶT GIT!" -ForegroundColor Red
    Write-Host "Vui lòng tải và cài đặt Git tại: https://git-scm.com/downloads" -ForegroundColor Yellow
    Read-Host "Nhấn Enter để thoát..."
    exit 1
}

# 2. Khởi tạo Git nếu chưa có
if (-not (Test-Path ".git")) {
    Write-Host "[1/3] Đang khởi tạo kho Git..." -ForegroundColor Green
    git init | Out-Null
}

# 3. Tự động thiết lập danh tính Git nếu chưa có
$currentName = git config user.name 2>$null
if ([string]::IsNullOrWhiteSpace($currentName)) {
    git config user.name "Dang Nhu"
    git config user.email "dnpn.ttqt@gmail.com"
}

# 4. Xác định link remote mặc định
$defaultUrl = "https://github.com/DangNhu192/VN2000-WGS84.git"
$existingUrl = git remote get-url origin 2>$null
if (-not [string]::IsNullOrWhiteSpace($existingUrl)) {
    $defaultUrl = $existingUrl.Trim()
}

Write-Host "Link Repository GitHub hiện tại:" -ForegroundColor White
Write-Host "👉 $defaultUrl" -ForegroundColor Yellow
Write-Host ""

$inputUrl = Read-Host "Nhấn Enter để dùng link trên, hoặc dán link mới"
if ([string]::IsNullOrWhiteSpace($inputUrl)) {
    $repoUrl = $defaultUrl
} else {
    $repoUrl = $inputUrl.Trim()
}

git remote remove origin 2>$null
git remote add origin $repoUrl

# 5. Đóng gói & Commit
Write-Host "`n[2/3] Đang đóng gói tài nguyên và tạo bản commit..." -ForegroundColor Green
git add .
git commit -m "Deploy VN2000 Pro PWA v2.2.3 for Vercel"
git branch -M main

# 6. Đẩy lên GitHub
Write-Host "`n[3/3] Đang tải mã nguồn lên GitHub (nhánh main)..." -ForegroundColor Green
Write-Host "[*] Chú ý: Nếu có cửa sổ trình duyệt bật lên, vui lòng chọn 'Sign in with your browser' để xác thực." -ForegroundColor Gray
Write-Host ""
git push -u origin main --force

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n====================================================================" -ForegroundColor Red
    Write-Host "[!] CHƯA THỂ TẢI LÊN GITHUB!" -ForegroundColor Red
    Write-Host "Nguyên nhân và cách xử lý:" -ForegroundColor Yellow
    Write-Host "  1. Bạn cần xác thực đăng nhập tài khoản GitHub qua trình duyệt." -ForegroundColor White
    Write-Host "  2. Link repository $repoUrl chưa được tạo trên https://github.com/new" -ForegroundColor White
    Write-Host "  3. Vui lòng kiểm tra lại quyền truy cập kho GitHub của bạn." -ForegroundColor White
    Write-Host "====================================================================" -ForegroundColor Red
    Read-Host "Nhấn Enter để thoát..."
    exit 1
}

# 7. Hướng dẫn Vercel
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
Read-Host "Nhấn Enter để hoàn tất..."
