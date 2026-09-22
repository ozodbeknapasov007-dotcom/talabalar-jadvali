@echo off
chcp 65001 > nul
title Talabalar Hujjatlari va Hisobot Tizimi
color 1F

echo ======================================================================
echo       TALABALAR HUJJATLARI VA HISOBOT TIZIMI
echo ======================================================================
echo.

cd /d "%~dp0"

echo [1/3] Eski server jarayonlari tozalanyapti...
powershell -Command "Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" > nul 2>&1

echo [2/3] Baza va hisobotlar tekshirilmoqda...
python qayta_tekshiruv\03_hisobot_yasat.py

echo.
echo [3/3] Veb-server ishga tushirilmoqda...
echo.
echo ======================================================================
echo   ✅ TIZIM MUVAFFAQIYATLI ISHGA TUSHDI!
echo.
echo   🌐 Lokal Portal: http://localhost:8080
echo   ☁️  Onlayn Portal: https://talabalar-ro-yhati.vercel.app
echo.
echo   Serverni to'xtatish uchun: Ctrl+C bosing yoki ushbu oynani yoping.
echo ======================================================================
echo.

start http://localhost:8080

python telegram_sync_service.py 8080

pause
