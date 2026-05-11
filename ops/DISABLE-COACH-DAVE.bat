@echo off
title Disable Coach Dave Delta autostart
color 0E

echo ================================================================
echo  Coach Dave Delta — disable autostart + stop the spawn UNKNOWN
echo  popups. CHIEF still reads Delta's saved setup files from disk.
echo ================================================================
echo.

REM --- 1. Kill any running Delta processes ---
echo [1/4] Killing running Coach Dave Delta processes...
taskkill /f /im "Coach Dave Delta.exe"      >nul 2>&1
taskkill /f /im "CoachDaveDelta.exe"        >nul 2>&1
taskkill /f /im "delta.exe"                 >nul 2>&1
REM Delta's Electron app sometimes registers under generic names too
for /f "tokens=2 delims=," %%P in ('tasklist /FO CSV /NH ^| findstr /i "coachdave delta"') do taskkill /f /pid %%~P >nul 2>&1
echo     done.

REM --- 2. Remove HKCU\Run autostart entries (most common location) ---
echo [2/4] Removing registry autostart entries (HKCU\Run)...
reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" 2>nul | findstr /i "CoachDave Delta" > "%TEMP%\cd-run-keys.txt"
for /f "tokens=1" %%K in ('type "%TEMP%\cd-run-keys.txt"') do (
    echo     deleting HKCU\Run\%%K
    reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v %%K /f >nul 2>&1
)
del "%TEMP%\cd-run-keys.txt" >nul 2>&1

REM --- 3. Remove Startup folder shortcut (the other common location) ---
echo [3/4] Removing Startup folder shortcuts...
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
if exist "%STARTUP_DIR%" (
    for %%F in ("%STARTUP_DIR%\*Coach*Dave*" "%STARTUP_DIR%\*Delta*") do (
        if exist %%F (
            echo     deleting %%F
            del /q %%F >nul 2>&1
        )
    )
)

REM --- 4. Disable any Scheduled Task Delta may have created ---
echo [4/4] Disabling Coach Dave Delta scheduled tasks...
for /f "tokens=*" %%T in ('schtasks /query /fo LIST 2^>nul ^| findstr /i "TaskName" ^| findstr /i "Coach Dave Delta"') do (
    set "TASKNAME=%%T"
    setlocal enabledelayedexpansion
    set "TASKNAME=!TASKNAME:TaskName:=!"
    set "TASKNAME=!TASKNAME: =!"
    schtasks /change /tn "!TASKNAME!" /disable >nul 2>&1
    echo     disabled !TASKNAME!
    endlocal
)

echo.
echo ================================================================
echo  DONE.
echo.
echo  - Coach Dave Delta will no longer auto-launch at startup.
echo  - The Delta error popup should NOT appear on next boot.
echo  - CHIEF still reads Delta's saved .cdd setups from disk —
echo    so your setup library is untouched.
echo.
echo  To launch Delta MANUALLY when you actually want it:
echo    Start menu -> Coach Dave Delta
echo  (or run the desktop shortcut).
echo ================================================================
echo.
pause
