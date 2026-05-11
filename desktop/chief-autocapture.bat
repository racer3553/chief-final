@echo off
title CHIEF Auto-Capture
color 0B
cd /d "%~dp0"

where python >nul 2>&1
if errorlevel 1 (
    echo Python not installed. Installing via winget...
    winget install --id Python.Python.3.11 -e --accept-source-agreements --accept-package-agreements
    echo Close this window and re-run after install completes.
    pause
    exit /b 1
)

python chief-autocapture.py
pause
