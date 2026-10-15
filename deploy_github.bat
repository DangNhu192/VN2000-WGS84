@echo off
setlocal EnableDelayedExpansion
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

:: 1. Khoi tao Git neu chua co
if not exist ".git" (
    echo [1/3] Dang khoi tao kho Git...
    git init
)

:: 2. Tu dong kiem tra va thiet lap danh tinh Git neu chua co
git config user.name >nul 2>&1
if errorlevel 1 (
    git config user.name "Dang Nhu"
    git config user.email "dnpn.ttqt@gmail.com"
)
git config user.email >nul 2>&1
if errorlevel 1 (
    git config user.email "dnpn.ttqt@gmail.com"
)

:: 3. Kiem tra link remote origin
set DEFAULT_URL=https://github.com/DangNhu192/VN2000-WGS84.git
git remote get-url origin >nul 2>&1
if not errorlevel 1 (
    for /f "delims=" %%i in ('git remote get-url origin') do set DEFAULT_URL=%%i
)

echo Link Repository GitHub hien tai:
echo !DEFAULT_URL!
echo.
set /p REPO_URL="[>] Nhan Enter de dung link tren hoac dan link moi: "
if "!REPO_URL!"=="" (
    set REPO_URL=!DEFAULT_URL!
)

git remote remove origin >nul 2>&1
git remote add origin !REPO_URL!

echo.
echo [2/3] Dang dong goi tai nguyen va tao ban commit...
git add .
git commit -m "Deploy VN2000 Pro PWA v2.2.4 for Vercel"
git branch -M main

echo.
echo [3/3] Dang tai ma nguon len GitHub (nhanh main)...
echo [*] Chu y: Neu co cua so trinh duyet bat len yeu cau dang nhap GitHub,
echo     vui long bam "Sign in with your browser" de xac thuc.
echo.
git push -u origin main --force
if errorlevel 1 (
    echo.
    echo ====================================================================
    echo [!] CHUA THE TAI LEN GITHUB!
    echo Nguyen nhan va cach xu ly:
    echo  1. Ban can xac thuc dang nhap GitHub qua trinh duyet.
    echo  2. Hoac kho %REPO_URL% chua duoc tao tren https://github.com/new.
    echo  3. Vui long kiem tra lai quyen truy cap kho GitHub cua ban.
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
