@echo off
title Stavya Intelligence HMS - Build Mobile APK and Desktop EXE
echo ========================================================
echo Stavya Intelligence HMS - Build Suite
echo ========================================================
echo.

set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
set "PATH=%JAVA_HOME%\bin;%PATH%"

cd /d "%~dp0"

echo [1/3] Building WWW Distribution Assets...
call npm run build:www

echo.
echo [2/3] Syncing Capacitor Android & Building Android APK...
call npx cap sync android
cd /d "%~dp0android"
call gradlew.bat assembleDebug
cd /d "%~dp0"

echo.
echo [3/3] Building Desktop Portable EXE...
call npm run electron:build

echo.
echo ========================================================
echo BUILD SUCCESSFUL!
echo ========================================================
echo 1. Mobile Android APK:
echo    d:\HMS TRIAL\android\app\build\outputs\apk\debug\app-debug.apk
echo.
echo 2. Desktop EXE Output Directory:
echo    d:\HMS TRIAL\dist\exe
echo ========================================================
pause
