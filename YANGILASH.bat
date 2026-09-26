@echo off
chcp 65001 > nul
title TALABALAR SHARTNOMALARI & HISOBOT TIZIMI - YANGILASH
color 0B

echo ======================================================================
echo       TALABALAR BAZASINI TEKSHIRISH VA YANGILASH TIZIMI
echo ======================================================================
echo.

cd /d "%~dp0"

echo [1/3] Baza tekshirilmoqda va hisobotlar yangilanmoqda...
python qayta_tekshiruv\03_hisobot_yasat.py

echo [2/3] Qabul shabloni va shubhali ma'lumotlar hisoboti yangilanmoqda...
python scripts\generate_qabul_shablon.py
python scripts\shubhali_malumotlar_audit.py

echo.
echo [3/3] Ma'lumot xizmati ishga tushirilmoqda...
echo.
echo ======================================================================
echo   ✅ TIZIM YANGILANDI!
echo   📁 Qabul shabloni:   hisobotlar\qabul\
echo   📁 Tekshiruvlar:     hisobotlar\tekshiruvlar\
echo   🌐 Portal: ISHGA_TUSHIRISH.bat orqali (http://localhost:3000)
echo ======================================================================
echo.

python xizmatlar\telegram_sync_service.py 8080

pause
