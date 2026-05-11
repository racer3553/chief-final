@echo off
title CHIEF — Master Launch (all systems)
color 0A
cd /d "%USERPROFILE%\Desktop\chief-autocapture"

echo ================================================================
echo  CHIEF — Master Launch
echo  Auto-pushes cached sessions, starts coach + strategist,
echo  opens the dashboard in your browser.
echo ================================================================
echo.

REM ---- Voice settings (female neural, slightly slower so less robotic) ----
REM Leave CHIEF_VOICE blank to let the script auto-pick a working female
REM neural voice (Aria first). Set explicitly to override:
REM   set CHIEF_VOICE=en-US-JennyNeural
set CHIEF_VOICE=
set CHIEF_RATE=-5%%
set CHIEF_PITCH=+0Hz

REM ---- Refresh deps quietly ----
python -m pip install --quiet pywin32 pyirsdk pygame requests 2>nul
python -m pip install --quiet --upgrade edge-tts 2>nul

REM ---- Push any locally-cached sessions + lap traces in the background ----
REM (Sessions/traces that failed to upload during a previous race get drained
REM to chiefracing.com first thing on launch. Runs minimized so it doesn't
REM get in the way.)
start "CHIEF push-cached"   /MIN cmd /c "python chief-push-cached.py && python chief-push-traces.py"

REM ---- Open the dashboard in your default browser ----
start https://chiefracing.com/dashboard

REM ---- Run the supervisor (spawns autocapture, live-chief, strategist) ----
python watchdog.py

echo.
echo Watchdog stopped.
pause
