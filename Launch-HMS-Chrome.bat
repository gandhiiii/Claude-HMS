@echo off
title Stavya Intelligence HMS
set FLUTTER_WEB=%~dp0hms_flutter\build\web\index.html
set MAIN_WEB=%~dp0index.html

if exist "%FLUTTER_WEB%" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app="file:///%FLUTTER_WEB:\=/%"
) else (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app="file:///%MAIN_WEB:\=/%"
)
