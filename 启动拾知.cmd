@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/start.ps1
if errorlevel 1 (pause) else (start "" http://127.0.0.1:3000)
