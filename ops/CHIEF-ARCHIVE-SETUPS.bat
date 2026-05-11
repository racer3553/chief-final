@echo off
title CHIEF — build permanent .sto archive
color 0A
cd /d "%USERPROFILE%\Desktop\chief-autocapture"

echo ================================================================
echo  CHIEF — build your permanent Coach Dave setup archive
echo ================================================================
echo  Why this matters: Coach Dave Delta rotates / deletes setup packs
echo  every season. If you cancel your CDA subscription you lose access
echo  to the in-app library. This builds a permanent local archive at
echo
echo      %USERPROFILE%\Documents\ChiefSetupLibrary\
echo
echo  organised by car code. You own these files forever — they keep
echo  working in iRacing whether or not CDA exists.
echo ================================================================
echo.
echo  Sources scanned:
echo    - Coach Dave Delta install folder
echo    - Desktop\Seteps (your manual downloads)
echo    - Desktop\Setups / Setups Backup
echo    - Any *.zip in those folders (will be extracted)
echo    - iRacing setups folder
echo ================================================================
echo.
echo  [D] Dry-run  - show what would be archived
echo  [C] Copy     - actually build the archive
echo  [O] Overwrite - rebuild from scratch (replaces existing archive files)
echo.

choice /c DCO /n /m "Pick mode: "
if errorlevel 3 goto over
if errorlevel 2 goto copy
if errorlevel 1 goto dry

:dry
python chief-archive-setups.py
goto end

:copy
python chief-archive-setups.py --copy
goto end

:over
python chief-archive-setups.py --copy --overwrite

:end
echo.
echo Archive lives at: %USERPROFILE%\Documents\ChiefSetupLibrary\
echo Next steps:
echo   1. CHIEF-IMPORT-SETUPS.bat to copy them into iRacing's garage
echo   2. CHIEF-DO-SETUPS.bat to push them to chiefracing.com
echo.
pause
