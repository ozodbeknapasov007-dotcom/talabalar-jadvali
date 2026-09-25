@echo off
title Talabalar Portali - WEB (Next.js)
color 0A

cd /d "%~dp0\web"

echo ======================================================================
echo       TALABALAR PORTALI - YANGI WEB SAHIFA (Next.js)
echo ======================================================================
echo.
echo   [OK] Yangi Web Portal:   http://localhost:3000
echo   [OK] Asosiy Eski Sahifa: http://localhost:8080  (ISHGA_TUSHIRISH.bat)
echo   [OK] Onlayn Web Sahifa:  https://talabalar-royhati.vercel.app/web
echo.
echo   Ikkala sahifa ham bir-biriga xalaqit bermasdan alohida ishlaydi.
echo ======================================================================
echo.

start http://localhost:3000
call npm run dev
pause