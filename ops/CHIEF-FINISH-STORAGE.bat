@echo off
title CHIEF — finish the cloud-storage activation
color 0E

echo ================================================================
echo  CHIEF — finalise Supabase Storage backup for your .sto library
echo  This bat:
echo    1) Opens the new Storage migration SQL for you to run
echo    2) Pushes new code to Vercel via CLI
echo    3) Re-parses every .sto with the improved parser
echo    4) Uploads raw .sto bytes to the cloud bucket
echo ================================================================
echo.

REM ----- STEP 1: run the Storage migration -----
echo [STEP 1/4] Opening Supabase SQL Editor + the new Storage migration...
start "" "https://supabase.com/dashboard/project/gsxmzhvalmlzgyfbcnih/sql/new"
timeout /t 2 >nul
start "" notepad "%USERPROFILE%\Desktop\CHIEF-MIGRATE-STORAGE.sql"
echo.
echo  - Notepad has the SQL.  Ctrl-A then Ctrl-C to copy.
echo  - In Supabase: paste into the new query tab, click Run.
echo  - You should see two result rows: "bucket=setup-files" and "col_storage_path=storage_path".
echo.
choice /c YN /n /m "Done with Storage SQL step? [Y=continue / N=abort]: "
if errorlevel 2 goto cancel

REM ----- STEP 2: deploy new code via Vercel CLI -----
echo.
echo ================================================================
echo  [STEP 2/4] Deploying new API + dashboard page to chiefracing.com
echo ================================================================
cd /d "%USERPROFILE%\Desktop\chief-final-repo"
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js missing. Install from https://nodejs.org
    pause
    exit /b 1
)
npx --yes vercel --prod --yes

echo.
echo Waiting 30 seconds for deploy to settle...
timeout /t 30

REM ----- STEP 3: re-parse + push setups with the improved parser -----
echo.
echo ================================================================
echo  [STEP 3/4] Re-parsing every .sto (new parser catches vendor notes)
echo ================================================================
cd /d "%USERPROFILE%\Desktop\chief-autocapture"
REM Wipe push markers so we re-push everything with the new parse data
if exist "%USERPROFILE%\Documents\ChiefAutoCapture\.pushed_setups" (
    rmdir /s /q "%USERPROFILE%\Documents\ChiefAutoCapture\.pushed_setups"
)
python chief-push-setups.py --all

REM ----- STEP 4: upload raw bytes to Supabase Storage -----
echo.
echo ================================================================
echo  [STEP 4/4] Uploading raw .sto bytes to Supabase Storage
echo  (permanent backup — cancel CDA tomorrow, still have everything)
echo ================================================================
python chief-storage-push.py

echo.
echo ================================================================
echo  ALL DONE.  Visit your library:
echo     https://chiefracing.com/dashboard/setups
echo ================================================================
goto end

:cancel
echo Aborted. Nothing changed.

:end
echo.
pause
