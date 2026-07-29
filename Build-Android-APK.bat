@echo off
title Stavya Intelligence HMS - Build Android APK
echo ========================================================
echo Building Android APK for Stavya Intelligence HMS...
echo ========================================================

set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
set "PATH=%JAVA_HOME%\bin;%PATH%"

cd /d "%~dp0"
echo [1/2] Syncing Web Assets to Android project...
call npx cap sync android

echo [2/2] Compiling Debug APK with Gradle...
cd /d "%~dp0android"
call gradlew.bat assembleDebug

copy /y "%~dp0android\app\build\outputs\apk\debug\app-debug.apk" "%~dp0Stavya-Intelligence-HMS.apk"

echo ========================================================
echo APK Build Completed!
echo Output APK path:
echo d:\HMS TRIAL\Stavya-Intelligence-HMS.apk
echo d:\HMS TRIAL\android\app\build\outputs\apk\debug\app-debug.apk
echo ========================================================
pause
