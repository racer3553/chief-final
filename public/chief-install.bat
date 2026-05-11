@echo off
setlocal enabledelayedexpansion
title CHIEF — Tester Installer
color 0A

cls
echo.
echo  =====================================================================
echo                 CHIEF :: AI CREW CHIEF FOR SIM RACING
echo                       TESTER ONBOARDING
echo  =====================================================================
echo.
echo   Welcome. This installer will:
echo     1) Ask for your email so Chief can attach your data to your account
echo     2) Open chiefracing.com so you can sign in
echo     3) Download the Chief desktop daemon from GitHub
echo     4) Install Python and required packages
echo     5) Put a 'Chief' icon on your Desktop
echo     6) Configure everything so the icon does the rest
echo.
echo   Estimated time: 3-5 minutes (mostly downloads)
echo   Requirements:  Windows 10/11, iRacing installed, internet
echo  =====================================================================
echo.
pause
cls

REM ===================== STEP 1: Email =====================
echo  [STEP 1/6] Your email
echo  ---------------------------------------------------------------------
echo  Chief uses your email to link your local sessions to your account
echo  on chiefracing.com. Use the SAME email Ben registered you with.
echo.
set "TESTER_EMAIL="
set /p TESTER_EMAIL="  Enter your email: "
if "%TESTER_EMAIL%"=="" (
    echo  No email entered. Aborting.
    pause
    exit /b 1
)
echo.
echo  OK -^> Chief will tag your captures with: %TESTER_EMAIL%
echo.
pause

REM ===================== STEP 2: Open chiefracing.com =====================
cls
echo  [STEP 2/6] Sign in to chiefracing.com
echo  ---------------------------------------------------------------------
echo  Opening https://chiefracing.com in your browser now.
echo  Sign in with: %TESTER_EMAIL%
echo  After signing in, come back here and press any key.
echo.
start "" "https://chiefracing.com"
pause

REM ===================== STEP 3: Prereq check =====================
cls
echo  [STEP 3/6] Checking prerequisites
echo  ---------------------------------------------------------------------
python --version >nul 2>&1
if errorlevel 1 (
    echo  Python not found. Attempting auto-install via winget...
    winget install -e --id Python.Python.3.12 --silent --accept-package-agreements --accept-source-agreements
    if errorlevel 1 (
        echo  Could not auto-install Python. Manual install:
        echo    1) https://www.python.org/downloads/
        echo    2) During install, CHECK "Add Python to PATH"
        echo    3) Re-run this installer
        pause
        exit /b 1
    )
    for /f "tokens=2*" %%A in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "Path=%%B"
)
echo  Python: OK
python --version
powershell -Command "$true" >nul 2>&1
if errorlevel 1 (
    echo  PowerShell not available.
    pause
    exit /b 1
)
echo  PowerShell: OK
echo.
pause

REM ===================== STEP 4: Download daemon =====================
cls
echo  [STEP 4/6] Downloading Chief daemon from GitHub
echo  ---------------------------------------------------------------------
set "TMP_ZIP=%TEMP%\chief-final.zip"
set "TMP_EXTRACT=%TEMP%\chief-final-extract"
set "CHIEF_DIR=%USERPROFILE%\Desktop\chief-autocapture"

if exist "%TMP_ZIP%" del /q "%TMP_ZIP%"
if exist "%TMP_EXTRACT%" rmdir /s /q "%TMP_EXTRACT%"
if not exist "%CHIEF_DIR%" mkdir "%CHIEF_DIR%"

echo  Downloading main branch ZIP (~30 MB) ...
powershell -NoProfile -Command ^
    "$ProgressPreference='SilentlyContinue';" ^
    "Invoke-WebRequest -Uri 'https://github.com/racer3553/chief-final/archive/refs/heads/main.zip' -OutFile '%TMP_ZIP%' -UseBasicParsing"
if errorlevel 1 (
    echo  Download failed. The repository may be private. Contact Ben.
    pause
    exit /b 1
)

echo  Extracting ...
powershell -NoProfile -Command "Expand-Archive -Path '%TMP_ZIP%' -DestinationPath '%TMP_EXTRACT%' -Force"
set "EXTRACTED_ROOT=%TMP_EXTRACT%\chief-final-main"

if exist "%EXTRACTED_ROOT%\desktop" (
    xcopy /Y /I /Q /E "%EXTRACTED_ROOT%\desktop\*" "%CHIEF_DIR%\" >nul
    echo  Daemon copied to: %CHIEF_DIR%
)
if exist "%EXTRACTED_ROOT%\ops" (
    for %%F in (CHIEF-VIEWER.bat CHIEF-IMPORT-SETUPS.bat CHIEF-PUSH-CACHED.bat DISABLE-COACH-DAVE.bat DISABLE-SIMAGIC.bat) do (
        if exist "%EXTRACTED_ROOT%\ops\%%F" copy /Y "%EXTRACTED_ROOT%\ops\%%F" "%USERPROFILE%\Desktop\" >nul
    )
)
echo.
pause

REM ===================== STEP 5: Install Python deps =====================
cls
echo  [STEP 5/6] Installing Python packages
echo  ---------------------------------------------------------------------
echo  This takes ~60-90 seconds.
echo.
python -m pip install --upgrade pip --quiet
python -m pip install --quiet pywin32 pyirsdk pygame requests edge-tts psutil
echo  Python packages: OK
echo.
pause

REM ===================== STEP 6: Configure + Chief icon =====================
cls
echo  [STEP 6/6] Writing your config + creating the Chief icon
echo  ---------------------------------------------------------------------

> "%CHIEF_DIR%\chief-config.bat" (
    echo @echo off
    echo set CHIEF_USER_EMAIL=%TESTER_EMAIL%
    echo set CHIEF_VOICE=
    echo set CHIEF_RATE=-5%%%%
    echo set CHIEF_PITCH=+0Hz
)
echo  Config written.

findstr /c:"chief-config.bat" "%CHIEF_DIR%\chief-launch.bat" >nul 2>&1
if errorlevel 1 (
    powershell -NoProfile -Command ^
        "$lines = Get-Content '%CHIEF_DIR%\chief-launch.bat';" ^
        "$out = @($lines[0], 'call ""%%~dp0chief-config.bat""') + $lines[1..($lines.Length-1)];" ^
        "Set-Content '%CHIEF_DIR%\chief-launch.bat' $out"
)

REM Download the Chief logo and convert it to a proper Windows .ico
REM so the Desktop shortcut shows the cool logo instead of a generic bat icon.
echo  Fetching Chief logo and converting to icon...
powershell -NoProfile -Command ^
    "$ProgressPreference='SilentlyContinue';" ^
    "$pngPath = '%CHIEF_DIR%\chief-icon.png';" ^
    "$icoPath = '%CHIEF_DIR%\chief-icon.ico';" ^
    "try {" ^
    "  Invoke-WebRequest 'https://chiefracing.com/images/chief-logo-small.png' -OutFile $pngPath -UseBasicParsing;" ^
    "  Add-Type -AssemblyName System.Drawing;" ^
    "  $bmp = [System.Drawing.Bitmap]::FromFile($pngPath);" ^
    "  $hicon = $bmp.GetHicon();" ^
    "  $icon = [System.Drawing.Icon]::FromHandle($hicon);" ^
    "  $fs = New-Object System.IO.FileStream($icoPath, 'Create');" ^
    "  $icon.Save($fs);" ^
    "  $fs.Close();" ^
    "  $bmp.Dispose();" ^
    "  Write-Host '  icon converted OK';" ^
    "} catch { Write-Host '  icon conversion skipped (will use default Windows icon)' }"

REM Build the Desktop shortcut, pointing at chief-launch.bat with the new icon
powershell -NoProfile -Command ^
    "$s = (New-Object -ComObject WScript.Shell).CreateShortcut('%USERPROFILE%\Desktop\Chief.lnk');" ^
    "$s.TargetPath = '%CHIEF_DIR%\chief-launch.bat';" ^
    "$s.WorkingDirectory = '%CHIEF_DIR%';" ^
    "$s.WindowStyle = 1;" ^
    "$s.Description = 'CHIEF - AI Crew Chief for Sim Racing';" ^
    "if (Test-Path '%CHIEF_DIR%\chief-icon.ico') { $s.IconLocation = '%CHIEF_DIR%\chief-icon.ico,0' };" ^
    "$s.Save()"
echo  Chief icon created on Desktop.
echo.

cls
echo  =====================================================================
echo                       INSTALLATION COMPLETE
echo  =====================================================================
echo.
echo   You are set up. Here is the daily workflow:
echo.
echo     1) Make sure you signed in at chiefracing.com as: %TESTER_EMAIL%
echo     2) Sit at your sim, double-click the 'Chief' icon on Desktop
echo     3) Launch iRacing as normal
echo     4) Chief will say "iRacing connected" and start coaching you
echo     5) Review your data at https://chiefracing.com/dashboard/sessions
echo.
echo   Bug reports / feedback: tell Ben directly.
echo  =====================================================================
echo.
start "" "https://chiefracing.com/dashboard/sessions"
pause
