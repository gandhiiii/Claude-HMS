@echo off
title Launch Discount App Module - Stavya HMS
echo ========================================================
echo Launching Discount Permission System Dev Server...
echo ========================================================
echo.

cd /d "%~dp0Discount"
cmd /c npm run dev

pause
