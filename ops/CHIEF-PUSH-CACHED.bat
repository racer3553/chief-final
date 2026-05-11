@echo off
title CHIEF — Push Cached Sessions to chiefracing.com
color 0A
cd /d "%USERPROFILE%\Desktop\chief-autocapture"

echo =================================================================
echo  CHIEF — re-push locally cached sessions to chiefracing.com
echo =================================================================
echo.
echo  Reads:   %USERPROFILE%\Documents\ChiefAutoCapture\sess_*.json
echo  Logs to: %USERPROFILE%\Desktop\chief-autocapture.log
echo.
echo  [P] Probe   - send a tiny payload to test auth + server health
echo  [N] New     - push only sessions not yet pushed (default)
echo  [A] All     - re-push every cached session
echo.

choice /c PNA /n /m "Pick mode: "
if errorlevel 3 goto allmode
if errorlevel 2 goto newmode
if errorlevel 1 goto probemode

:probemode
python chief-push-cached.py --probe
goto end

:newmode
python chief-push-cached.py
echo.
echo --- now pushing lap telemetry traces ---
python chief-push-traces.py
goto end

:allmode
python chief-push-cached.py --all
echo.
echo --- now pushing ALL lap telemetry traces ---
python chief-push-traces.py --all

:end
echo.
echo Detailed log: %USERPROFILE%\Desktop\chief-autocapture.log
echo.
pause
