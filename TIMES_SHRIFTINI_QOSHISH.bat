@echo off
chcp 65001 > nul
title Ma'lumotnoma uchun Times New Roman shrifti
color 1F
cd /d "%~dp0"

echo ======================================================================
echo   MA'LUMOTNOMA UCHUN TIMES NEW ROMAN SHRIFTI (bir martalik)
echo ======================================================================
echo.

set "DST=web\assets\malumotnoma"
for %%f in (times.ttf timesbd.ttf timesi.ttf) do (
    if not exist "%WINDIR%\Fonts\%%f" (
        echo   XATO: %WINDIR%\Fonts\%%f topilmadi.
        pause
        exit /b 1
    )
    copy /y "%WINDIR%\Fonts\%%f" "%DST%\%%f" > nul
    echo   [OK] %%f nusxalandi
)

echo.
echo   GitHub'ga yuklanmoqda (Vercel'dagi portal ham shu shriftni ishlatadi)...
git add -- "%DST%\times.ttf" "%DST%\timesbd.ttf" "%DST%\timesi.ttf"
git commit -m "Ma'lumotnoma: Times New Roman shrifti" -- "%DST%\times.ttf" "%DST%\timesbd.ttf" "%DST%\timesi.ttf"
git push origin HEAD:main
if errorlevel 1 (
    git pull --no-rebase --no-edit origin main
    git push origin HEAD:main
)

echo.
echo ======================================================================
echo   TAYYOR: ma'lumotnoma endi Times New Roman bilan chiqadi.
echo   Kompyuterdagi portalni qayta ishga tushiring: TEZ_ISHGA_TUSHIRISH.bat
echo ======================================================================
pause
