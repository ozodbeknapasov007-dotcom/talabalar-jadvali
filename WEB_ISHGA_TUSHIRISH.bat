@echo off
title Talabalar Portali - WEB (Next.js)
color 0A

cd /d "%~dp0\web"

echo ======================================================================
echo       TALABALAR PORTALI - ASOSIY WEB SAHIFA (Next.js)
echo ======================================================================
echo.
echo   [OK] Asosiy Web Portal:  http://localhost:3000
echo   [OK] Onlayn Portal:      https://talabalar-royhati.vercel.app
echo.
echo   Tahrirlash va saqlash uchun ma'lumot xizmati ham ishlashi kerak
echo   (ISHGA_TUSHIRISH.bat ikkalasini birga ishga tushiradi).
echo ======================================================================
echo.

start http://localhost:3000
call npm run dev
pause
