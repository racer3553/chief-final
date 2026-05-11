@echo off
title CHIEF — Import Coach Dave Delta setups to iRacing
color 0B
cd /d "%USERPROFILE%\Desktop\chief-autocapture"

echo ================================================================
echo  CHIEF — import Coach Dave .sto setups into iRacing
echo ================================================================
echo  Scans your Coach Dave folders, copies .sto setup files into
echo  Documents\iRacing\setups\ so iRacing's in-game garage finds
echo  them. Lets you use your paid CDA library without Delta running.
echo ================================================================
echo.
echo  [D] Dry-run    - see what WOULD be copied (no changes)
echo  [S] Smart      - copy each file into the matching car folder
echo  [F] Flat       - copy all into Documents\iRacing\setups\_chief-imports
echo                   (easier to browse in-game, you sort later)
echo.

choice /c DSF /n /m "Pick mode: "
if errorlevel 3 goto flat
if errorlevel 2 goto smart
if errorlevel 1 goto dry

:dry
python chief-import-setups.py
goto end

:smart
python chief-import-setups.py --copy
goto end

:flat
python chief-import-setups.py --copy --flat

:end
echo.
pause
