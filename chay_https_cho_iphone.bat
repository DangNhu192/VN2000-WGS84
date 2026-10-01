@echo off
chcp 65001 >nul
title PWA VN2000 Pro - Co HTTPS cho iPhone
echo ====================================================================
echo   KHOI DONG APP TRAC DIA VN-2000 CO HTTPS DANG KY CHO IPHONE SAFARI
echo ====================================================================
echo.
echo 1. Dang khoi dong may chu noi bo port 8080...
start /b node server.js
timeout /t 2 >nul
echo.
echo 2. Dang tao duong link HTTPS bao mat (Apple yeu cau de bat GPS)...
echo.
echo ====================================================================
echo 👉 MO TRINH DUYET SAFARI TREN IPHONE VA TRUY CAP DUONG LINK DUOI DAY:
echo ====================================================================
npx --yes localtunnel --port 8080
pause
