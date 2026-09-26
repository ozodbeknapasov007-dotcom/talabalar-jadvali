@echo off
chcp 65001 > nul
title Talabalar Portali - Asosiy ishga tushirish
color 1F

echo ======================================================================
echo       TALABALAR HUJJATLARI VA HISOBOT TIZIMI
echo ======================================================================
echo.

cd /d "%~dp0"

echo [1/4] Eski server jarayonlari tozalanyapti (8080, 3000)...
powershell -Command "Get-NetTCPConnection -LocalPort 8080,3000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" > nul 2>&1

echo [2/4] Baza va hisobotlar yangilanmoqda...
python qayta_tekshiruv\03_hisobot_yasat.py

echo [3/4] Ma'lumot xizmati (Excel, Telegram bot, GitHub sinxron) ishga tushirilmoqda...
start "Talabalar - Ma'lumot xizmati (8080)" cmd /k python xizmatlar\telegram_sync_service.py 8080

echo [4/4] Yangi web portal ishga tushirilmoqda...
start "Talabalar - Web portal (3000)" /D "%~dp0web" cmd /k npm run dev

echo.
echo ======================================================================
echo   ✅ TIZIM ISHGA TUSHDI!
echo.
echo   🌐 Asosiy portal:        http://localhost:3000
echo   ☁️  Onlayn portal:        https://talabalar-royhati.vercel.app
echo   🗄️  Eski portal (arxiv):  http://localhost:8080
echo.
echo   Ochilgan ikki oynani yopmang — ular portal ishlashi uchun kerak.
echo ======================================================================
echo.

timeout /t 8 /nobreak > nul
start http://localhost:3000
