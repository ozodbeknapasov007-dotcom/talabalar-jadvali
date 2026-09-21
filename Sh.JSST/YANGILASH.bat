@echo off
chcp 65001 > nul
echo =========================================================
echo   Shahrisabz JSST: PDF Qayta Tahlil va Hisobot Yangilash
echo =========================================================
python extract_shahrisabz_jsst.py
echo.
echo =========================================================
echo   ✅ Muvaffaqiyatli yakunlandi! Hisobot ochilmoqda...
echo =========================================================
start "" "hisobot.html"
pause
