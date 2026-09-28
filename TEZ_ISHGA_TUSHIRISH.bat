@echo off
chcp 65001 > nul
title Talabalar Portali - Tez ishga tushirish
color 1F
cd /d "%~dp0"

echo ======================================================================
echo       TALABALAR PORTALI - TEZ ISHGA TUSHIRISH
echo ======================================================================
echo.

echo [1/4] Eski jarayonlar to'xtatilmoqda (8080, 3000)...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8080,3000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" > nul 2>&1

echo [2/4] Ma'lumot xizmati (8080) fonda ishga tushirilmoqda...
start "Talabalar - Ma'lumot xizmati (8080)" /min cmd /k python xizmatlar\telegram_sync_service.py 8080

cd /d "%~dp0web"
if not exist node_modules\ (
    echo       node_modules yo'q - bir martalik o'rnatish...
    call npm install --no-audit --no-fund
)

rem Portal faqat web\ kodi o'zgargan bo'lsa qayta yig'iladi (git bo'yicha)
set "WEBHASH="
for /f %%h in ('git rev-parse HEAD:web 2^>nul') do set "WEBHASH=%%h"
set "OLDHASH="
if exist .next\portal_build_hash.txt set /p OLDHASH=<.next\portal_build_hash.txt
if not exist .next\BUILD_ID goto build
if not defined WEBHASH goto tayyor
if /i "%WEBHASH%"=="%OLDHASH%" goto tayyor

:build
echo [3/4] Kod yangilangan - portal yig'ilmoqda (bir marta, ~1 daqiqa)...
call npm run build
if errorlevel 1 (
    echo.
    echo   XATO: portal yig'ilmadi. Yuqoridagi xabarni ko'ring.
    pause
    exit /b 1
)
if defined WEBHASH (> .next\portal_build_hash.txt echo %WEBHASH%)
goto run

:tayyor
echo [3/4] Portal tayyor - qayta yig'ish shart emas.

:run
echo [4/4] Portal ishga tushirilmoqda (http://localhost:3000)...
start "Talabalar - Web portal (3000)" /min cmd /k npm start

rem Port ochilishi bilan brauzerni ochamiz (ko'pi bilan 30 soniya kutadi)
powershell -NoProfile -Command "for($i=0;$i -lt 100;$i++){try{$c=New-Object Net.Sockets.TcpClient('127.0.0.1',3000);$c.Close();exit 0}catch{Start-Sleep -Milliseconds 300}};exit 1" > nul 2>&1
start http://localhost:3000

echo.
echo ======================================================================
echo   TAYYOR:  http://localhost:3000
echo   Ikki kichraytirilgan oynani (8080 va 3000) yopmang.
echo   Hisobotlarni yangilash kerak bo'lsa: YANGILASH.bat
echo ======================================================================
timeout /t 4 > nul
