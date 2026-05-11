@echo off
title CHIEF - One-Click Setup
color 0B
cd /d "%~dp0"

echo ================================================
echo   CHIEF - FULL AUTO SETUP
echo ================================================
echo.

REM === 1. Install Python if missing ===
where python >nul 2>&1
if errorlevel 1 (
    echo [1/5] Python missing - installing via winget...
    winget install --id Python.Python.3.11 -e --accept-source-agreements --accept-package-agreements
    echo.
    echo Python just installed. CLOSE this window and double-click GO.bat again.
    pause
    exit /b 1
)
echo [1/5] Python OK

REM === 2. Install Python deps ===
echo [2/5] Installing deps...
python -m pip install --quiet --upgrade pyirsdk requests psutil 2>nul
echo Done.

REM === 3. Test hardware scanner ===
echo.
echo [3/5] Scanning your sim hardware...
echo ------------------------------------------------
python vendors.py 2>nul | findstr /i "detected.*true wheels pedals motion sim coach iracing"
echo ------------------------------------------------
echo.

REM === 4. Add to Windows startup ===
echo [4/5] Installing auto-start...
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "TARGET=%USERPROFILE%\Desktop\chief-autocapture\chief-autocapture.bat"
set "SHORTCUT=%STARTUP%\Chief AutoCapture.lnk"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $sc = $ws.CreateShortcut('%SHORTCUT%'); $sc.TargetPath = '%TARGET%'; $sc.WorkingDirectory = '%USERPROFILE%\Desktop\chief-autocapture'; $sc.WindowStyle = 7; $sc.Save()" >nul 2>&1
if exist "%SHORTCUT%" (
    echo Auto-start INSTALLED. Daemon now runs every Windows login.
) else (
    echo Auto-start failed - re-run as Administrator if needed.
)

REM === 5. Start the daemon ===
echo.
echo [5/5] Starting daemon now...
echo.
echo ================================================
echo   IMPORTANT: ONE MORE STEP
echo   Open Supabase SQL editor and run the SQL in:
echo   Drive ^> CHIEF-DEPLOY-INSTRUCTIONS.md
echo ================================================
echo.
timeout /t 5 /nobreak >nul
python chief-autocapture.py
pause
