@echo off
title CHIEF — voice + iRacing diagnostic
color 0E

cls
echo  =====================================================================
echo                CHIEF :: voice coach diagnostic
echo  =====================================================================
echo  Tests every layer end-to-end so we know exactly why the coach
echo  isn't talking. Output ends with a SUMMARY block - screenshot
echo  that and send to Ben.
echo  =====================================================================
echo.

REM ===================== STEP 1: Python =====================
echo  [1/7] Python install...
python --version 2>nul
if errorlevel 1 (
    echo     FAIL: Python not in PATH
    set "FAIL_PYTHON=1"
) else (
    echo     OK
)
echo.

REM ===================== STEP 2: Chief folder =====================
echo  [2/7] Chief daemon folder...
if exist "%USERPROFILE%\Desktop\chief-autocapture\live-chief.py" (
    echo     OK: live-chief.py found
) else (
    echo     FAIL: live-chief.py missing - re-run the installer from chiefracing.com/install
    set "FAIL_FOLDER=1"
)
echo.

REM ===================== STEP 3: SAPI voice test =====================
echo  [3/7] Windows SAPI voice (offline fallback)...
python -c "import win32com.client; v=win32com.client.Dispatch('SAPI.SpVoice'); v.Speak('Chief voice test one. If you hear this Windows TTS works.', 1)" 2>nul
if errorlevel 1 (
    echo     FAIL: SAPI threw an error. pywin32 may not be installed.
    set "FAIL_SAPI=1"
) else (
    echo     OK: SAPI ran. Did you HEAR the voice? If not, check Windows audio device.
)
echo.

REM ===================== STEP 4: edge-tts (neural) =====================
echo  [4/7] Microsoft Edge neural voice (online)...
python -c "import edge_tts" 2>nul
if errorlevel 1 (
    echo     edge-tts not installed - trying install...
    python -m pip install --quiet edge-tts
)
python -c "import asyncio, edge_tts, tempfile, os; p=tempfile.mktemp(suffix='.mp3'); asyncio.run(edge_tts.Communicate('test','en-US-AriaNeural').save(p)); print('  edge-tts file size:', os.path.getsize(p))" 2>nul
if errorlevel 1 (
    echo     FAIL: edge-tts could not synthesize. Network may be blocking Microsoft.
    set "FAIL_EDGE=1"
) else (
    echo     OK
)
echo.

REM ===================== STEP 5: pyirsdk (iRacing detection) =====================
echo  [5/7] iRacing telemetry SDK...
python -c "import irsdk; ir=irsdk.IRSDK(); ir.startup(); print('  Connected:', ir.is_connected); print('  On track:', bool(ir['IsOnTrackCar']) if ir.is_connected else 'n/a')" 2>nul
if errorlevel 1 (
    echo     FAIL: pyirsdk not installed or iRacing not running.
    set "FAIL_IRSDK=1"
) else (
    echo     OK
)
echo.

REM ===================== STEP 6: Running Chief processes =====================
echo  [6/7] Active Chief processes...
tasklist /v /fo csv 2>nul | findstr /i "chief-autocapture live-chief pre-race-strategist chief-screenshot" | findstr /v "findstr" >nul 2>&1
if errorlevel 1 (
    echo     WARN: No Chief Python processes running. Did you click the Chief icon?
    set "FAIL_RUNNING=1"
) else (
    echo     OK: Chief processes are alive
    tasklist /v /fo csv 2>nul | findstr /i "live-chief"
)
echo.

REM ===================== STEP 7: Network reachability =====================
echo  [7/7] chiefracing.com reachable...
powershell -NoProfile -Command "try { (Invoke-WebRequest -Uri 'https://chiefracing.com' -UseBasicParsing -TimeoutSec 5).StatusCode } catch { 'FAIL' }"
echo.

REM ===================== SUMMARY =====================
echo.
echo  =====================================================================
echo                          SUMMARY
echo  =====================================================================
if defined FAIL_PYTHON   echo  X  Python not installed - install Python 3.10+ from python.org
if defined FAIL_FOLDER   echo  X  Chief daemon files missing - re-run installer from chiefracing.com/install
if defined FAIL_SAPI     echo  X  Windows SAPI broken - run: python -m pip install pywin32
if defined FAIL_EDGE     echo  X  Neural TTS blocked - check firewall, Chief will fall back to SAPI
if defined FAIL_IRSDK    echo  X  iRacing SDK issue - make sure iRacing is RUNNING and on track
if defined FAIL_RUNNING  echo  X  Chief daemon not running - double-click Chief icon on Desktop
if not defined FAIL_PYTHON if not defined FAIL_FOLDER if not defined FAIL_SAPI if not defined FAIL_EDGE if not defined FAIL_IRSDK if not defined FAIL_RUNNING (
    echo  All systems OK. If the coach still isn't talking:
    echo    - Confirm Windows is outputting audio to the device you're listening on
    echo    - Confirm iRacing is on track ^(in-car, not menu^)
    echo    - Open Desktop\chief-coach.log and check the last 20 lines for errors
)
echo  =====================================================================
echo.
echo  Last 20 lines of chief-coach.log:
echo  ---------------------------------------------------------------------
if exist "%USERPROFILE%\Desktop\chief-coach.log" (
    powershell -NoProfile -Command "Get-Content '%USERPROFILE%\Desktop\chief-coach.log' -Tail 20"
) else (
    echo  ^(chief-coach.log doesn't exist yet - Chief has never run on this PC^)
)
echo  ---------------------------------------------------------------------
echo.
pause
