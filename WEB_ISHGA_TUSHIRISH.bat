@echo off
chcp 65001 > nul
title Talabalar Portali - WEB (Next.js)
color 0A

echo ======================================================================
echo       TALABALAR PORTALI — YANGI WEB SAHIFA (Next.js)
echo ======================================================================
echo.

cd /d "%~dp0\web"

if not exist "node_modules" (
    echo [1/2] Paketlar o'rnatilmoqda ^(npm install^)...
    call npm install
)

echo.
echo [2/2] Web-portal ishga tushirilmoqda...
echo.
echo ======================================================================
echo   ✅ YANGI WEB SAHIFA TAYYOR!
echo.
echo   🌐 Yangi Web Portal:  http://localhost:3000
echo   🌐 Asosiy Eski Sahifa: http://localhost:8080  ^(ISHGA_TUSHIRISH.bat^)
echo.
echo   Ikkala sahifa ham bir-biriga xalaqit bermasdan alohida ishlaydi.
echo ======================================================================
echo.

start http://localhost:3000
call npm run dev
pause
