@echo off
chcp 65001 > nul
title Telegram Bot va Hisobot Serveri (09:00 Kontingent / 18:00 JSON Baza)
color 1F

cd /d "%~dp0"

echo ======================================================================
echo   🤖 TELEGRAM BOT TUGMALARI VA AVTOMATIK HISOBOT TIZIMI
echo ======================================================================
echo   - Bot tugmalari: Kontingent, 1. Buxgalteriya, 2. Admin, 3. Guruh rahbarlari, 4. To'liq
echo   - Har kuni 09:00 da (Yakshanbadan tashqari): Kontingent hisoboti
echo   - Har kuni 18:00 da: .json baza zahirasi
echo ======================================================================
echo.

python xizmatlar\telegram_sync_service.py 8080
pause
