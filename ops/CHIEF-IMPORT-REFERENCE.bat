@echo off
title CHIEF — Import Reference Lap
color 0D
cd /d "%USERPROFILE%\Desktop\chief-autocapture"

echo ================================================
echo  CHIEF — Reference Lap Importer
echo ================================================
echo  Promote captured laps into reusable reference
echo  packs that the Live Coach + Viewer use.
echo.
echo  Tip: pass --auto-seed to bulk-import the
echo       fastest lap for every car/track you've run.
echo ================================================
echo.

REM Ask the user which mode
choice /c IA /n /m "Press [I] for interactive picker, [A] for auto-seed all best laps: "
if errorlevel 2 goto autoseed
if errorlevel 1 goto interactive

:interactive
python chief-import-reference.py
goto end

:autoseed
python chief-import-reference.py --auto-seed --force

:end
echo.
echo Done. Reference packs are at:
echo   %USERPROFILE%\Documents\ChiefAutoCapture\references\
echo.
pause
