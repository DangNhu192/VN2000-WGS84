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

Write-Host "BƯỚC 1: Truy cập https://github.com/new để tạo 1 kho mới trên GitHub." -ForegroundColor White
Write-Host "(Ví dụ đặt tên kho: vn2000, chọn chế độ Public)" -ForegroundColor Gray
Write-Host ""

$repoUrl = Read-Host "👉 Dán link Repository GitHub của bạn vào đây (VD: https://github.com/user/vn2000.git)"
if ([string]::IsNullOrWhiteSpace($repoUrl)) {
    Write-Host "`n[!] Bạn chưa nhập link GitHub repository. Vui lòng chạy lại script." -ForegroundColor Red
    Read-Host "Nhấn Enter để thoát..."
    exit 1
}

# 3. Cấu hình Remote
git remote remove origin 2>$null
git remote add origin $repoUrl.Trim()

# 4. Đóng gói & Commit
Write-Host "`n[2/3] Đang đóng gói tài nguyên và tạo bản commit..." -ForegroundColor Green
git add .
git commit -m "Deploy VN2000 Pro PWA v2.2.3 for Vercel" 2>$null | Out-Null
git branch -M main

# 5. Đẩy lên GitHub
Write-Host "`n[3/3] Đang tải mã nguồn lên GitHub (nhánh main)..." -ForegroundColor Green
git push -u origin main --force

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n====================================================================" -ForegroundColor Red
    Write-Host "[!] CHƯA THỂ TẢI LÊN GITHUB!" -ForegroundColor Red
    Write-Host "Nguyên nhân thường gặp:" -ForegroundColor Yellow
    Write-Host "  1. Bạn chưa đăng nhập tài khoản GitHub trên máy tính." -ForegroundColor White
    Write-Host "  2. Link repository không đúng hoặc bạn chưa tạo kho trên GitHub." -ForegroundColor White
    Write-Host "  3. Bạn chưa được cấp quyền ghi vào repository này." -ForegroundColor White
    Write-Host "====================================================================" -ForegroundColor Red
    Read-Host "Nhấn Enter để thoát..."
    exit 1
}

# 6. Hướng dẫn Vercel
Write-Host "`n====================================================================" -ForegroundColor Green
Write-Host "  ✓ ĐÃ TẢI LÊN GITHUB THÀNH CÔNG!" -ForegroundColor Green
Write-Host "====================================================================" -ForegroundColor Green
Write-Host "BƯỚC 2: KẾT NỐI VỚI VERCEL (Chỉ mất 30 giây - Có link HTTPS cực nhanh):" -ForegroundColor Cyan
Write-Host "  1. Mở trang https://vercel.com/new và đăng nhập bằng tài khoản GitHub." -ForegroundColor White
Write-Host "  2. Tìm kho lưu trữ vừa đẩy lên (VD: vn2000) và bấm nút 'Import'." -ForegroundColor White
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
