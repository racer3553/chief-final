@echo off
title CHIEF — Telemetry Viewer
color 0B
cd /d "%USERPROFILE%\Desktop\chief-autocapture"

echo ================================================
echo  CHIEF — Telemetry Viewer
echo ================================================
echo  Reads lap traces from:
echo    %USERPROFILE%\Documents\ChiefAutoCapture\traces\
echo  Opens browser to http://localhost:8765
echo ================================================
echo.

REM Make sure Python deps are present (stdlib only, but safe to install nothing)
REM No third-party packages needed for the viewer.

python chief-viewer.py

echo.
echo Viewer stopped.
pause
