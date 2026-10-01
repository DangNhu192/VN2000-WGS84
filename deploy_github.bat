@echo off
setlocal
title Day App VN-2000 Pro Len GitHub va Vercel

echo ====================================================================
echo     TU DONG DUA APP VN-2000 PRO LEN GITHUB VA TRIEN KHAI VERCEL
echo ====================================================================
echo.

where git >nul 2>&1
if errorlevel 1 (
    echo [!] MAY TINH CHUA CAI DAT GIT!
    echo Vui long tai va cai dat Git tai: https://git-scm.com/downloads
    echo.
    pause
    exit /b 1
)

if not exist ".git" (
    echo [1/3] Dang khoi tao kho Git...
    git init
)

echo BUOC 1: Truy cap https://github.com/new de tao 1 kho moi tren GitHub.
echo (Vi du dat ten repository: vn2000, chon che do Public)
echo.

set /p REPO_URL="[>] Dan link Repository GitHub cua ban (VD: https://github.com/user/vn2000.git): "
if "%REPO_URL%"=="" goto NO_URL

git remote remove origin >nul 2>&1
git remote add origin %REPO_URL%

echo.
echo [2/3] Dang dong goi tai nguyen va tao ban commit...
git add .
git commit -m "Deploy VN2000 Pro PWA v2.2.3 for Vercel" >nul 2>&1
git branch -M main

echo.
echo [3/3] Dang tai ma nguon len GitHub (nhanh main)...
git push -u origin main --force
if errorlevel 1 (
    echo.
    echo ====================================================================
    echo [!] CHUA THE TAI LEN GITHUB!
    echo Nguyen nhan thuong gap:
    echo  1. Ban chua dang nhap tai khoan GitHub tren may tinh.
    echo  2. Link repository chua dung hoac ban chua tao kho moi tren GitHub.
    echo  3. Kho GitHub cua ban khong cho phep quyen ghi.
    echo ====================================================================
    pause
    exit /b 1
)

echo.
echo ====================================================================
echo  [V] DA TAI LEN GITHUB THANH CONG!
echo ====================================================================
echo BUOC 2: KET NOI VOI VERCEL (Co link HTTPS cuc nhanh):
echo   1. Mo trang https://vercel.com/new va dang nhap bang GitHub.
echo   2. Tim kho luu tru vua day len va bam nut "Import".
echo   3. Tai man hinh "Configure Project":
echo      - Framework Preset: Chon "Other"
echo      - Root Directory: De trong
echo      - Bam nut "Deploy".
echo.
echo [*] SAU 20 GIAY, BAN SE CO LINK HTTPS TOAN CAU:
echo     https://[ten-du-an].vercel.app
echo.
echo [*] CAC LAN CAP NHAT SAU:
echo     Moi khi sua code, chi can chay lai file nay de day len GitHub,
echo     Vercel se TU DONG CAP NHAT ung dung ngay lap tuc!
echo ====================================================================
pause
exit /b 0

:NO_URL
echo.
echo [!] Ban chua nhap link GitHub repository. Vui long mo lai file de thuc hien.
pause
exit /b 1
