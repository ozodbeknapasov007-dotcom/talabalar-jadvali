@echo off
chcp 65001 > nul
title TALABALAR SHARTNOMALARI & HISOBOT TIZIMI - YANGILASH
color 0B

echo ======================================================================
echo       TALABALAR BAZASINI TEKSHIRISH VA YANGILASH TIZIMI
echo ======================================================================
echo.

cd /d "%~dp0"

echo [1/2] Baza tekshirilmoqda va hisobotlar yangilanmoqda...
python qayta_tekshiruv\03_hisobot_yasat.py
python scripts\generate_report.py

echo.
echo [2/2] Veb-server ishga tushirilmoqda...
echo.
echo ======================================================================
echo   ✅ TIZIM YANGILANDI VA ISHGA TUSHDI!
echo   🌐 Manzil: http://localhost:8080/hisobot.html
echo ======================================================================
echo.

python telegram_sync_service.py 8080

pause
