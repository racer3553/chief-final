@echo off
title Install Chief Auto-Capture in Windows Startup
color 0E

set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "TARGET=%USERPROFILE%\Desktop\chief-autocapture\chief-autocapture.bat"
set "SHORTCUT=%STARTUP%\Chief AutoCapture.lnk"

if not exist "%TARGET%" (
    echo ERROR: chief-autocapture.bat not found.
    pause
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $sc = $ws.CreateShortcut('%SHORTCUT%'); $sc.TargetPath = '%TARGET%'; $sc.WorkingDirectory = '%USERPROFILE%\Desktop\chief-autocapture'; $sc.WindowStyle = 7; $sc.Description = 'Chief auto-capture daemon'; $sc.Save()"

if exist "%SHORTCUT%" (
    echo SUCCESS - Chief AutoCapture will run on every Windows login.
    echo Every iRacing session you do is now captured automatically.
) else (
    echo Failed. Try running as Administrator.
)
pause
