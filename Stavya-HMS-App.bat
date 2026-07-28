@echo off
title Stavya Intelligence HMS App
cd /d "%~dp0"
start "" "%~dp0node_modules\electron\dist\electron.exe" "%~dp0electron\main.js"
