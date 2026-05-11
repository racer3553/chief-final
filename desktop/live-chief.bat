@echo off
title CHIEF LIVE - Crew Chief In Your Ear
color 0A
cd /d "%~dp0"

where python >nul 2>&1
if errorlevel 1 (
    echo Python not installed.
    pause
    exit /b 1
)

python live-chief.py
pause
