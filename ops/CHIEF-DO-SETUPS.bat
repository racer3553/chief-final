@echo off
title CHIEF — activate Coach Dave setup pipeline (5 steps)
color 0E

echo ================================================================
echo  CHIEF — activate the .sto setup pipeline end-to-end
echo  0) Build permanent .sto archive (extracts zips, mirrors loose files)
echo  1) Run SQL migration in Supabase (manual paste)
echo  2) Copy .sto files into iRacing's setups folder
echo  3) Deploy the new API + AI route to chiefracing.com
echo  4) Parse all .sto files and push to the cloud
echo ================================================================
echo.

REM ----- STEP 0: build permanent local archive (extracts zips) -----
echo [STEP 0/4] Building permanent archive at Documents\ChiefSetupLibrary\
cd /d "%USERPROFILE%\Desktop\chief-autocapture"
python chief-archive-setups.py --copy
echo.

REM ----- STEP 1: SQL migration -----
echo [STEP 1/4] Opening Supabase SQL Editor and the migration SQL...
start "" "https://supabase.com/dashboard/project/gsxmzhvalmlzgyfbcnih/sql/new"
timeout /t 2 >nul
start "" notepad "%USERPROFILE%\Desktop\CHIEF-MIGRATE-SETUPS.sql"
echo.
echo  - Notepad has the SQL. Ctrl-A then Ctrl-C to copy.
echo  - In the Supabase tab that just opened, paste and click Run.
echo  - You should see current_rows = 0.
echo.
choice /c YN /n /m "Done with SQL step? [Y=continue / N=abort]: "
if errorlevel 2 goto cancel

REM ----- STEP 2: copy .sto files into iRacing setups folder -----
echo.
echo ================================================================
echo  [STEP 2/4] Copying .sto files into iRacing setups folder
echo ================================================================
cd /d "%USERPROFILE%\Desktop\chief-autocapture"
python chief-import-setups.py --copy --flat
echo.

REM ----- STEP 3: deploy new code to Vercel -----
echo ================================================================
echo  [STEP 3/4] Deploying new API + AI route to chiefracing.com
echo ================================================================
cd /d "%USERPROFILE%\Desktop\chief-final-repo"

REM Use Vercel CLI (skips GitHub auto-deploy entirely)
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed. Install from https://nodejs.org and retry.
    pause
    exit /b 1
)
echo Running: npx vercel --prod --yes
npx --yes vercel --prod --yes

echo.
echo Waiting 30 seconds for the deploy to settle...
timeout /t 30

REM ----- STEP 4: parse + push all .sto files to cloud -----
echo.
echo ================================================================
echo  [STEP 4/5] Parsing + pushing every .sto setup to chiefracing.com
echo ================================================================
cd /d "%USERPROFILE%\Desktop\chief-autocapture"
python chief-push-setups.py --all

REM ----- STEP 5: upload raw .sto BYTES to Supabase Storage (cloud backup) -----
echo.
echo ================================================================
echo  [STEP 5/5] Uploading raw .sto bytes to cloud (permanent backup)
echo  This is the safety net: if you cancel Coach Dave AND your PC
echo  dies, you can still re-download every file from chiefracing.com.
echo ================================================================
cd /d "%USERPROFILE%\Desktop\chief-autocapture"
python chief-storage-push.py

echo.
echo ================================================================
echo  ALL DONE.
echo  Your Coach Dave library is now:
echo    - Usable in iRacing directly (no Delta needed)
echo    - Visible to Chief's AI tune-setup endpoint
echo.
echo  Try it: open chiefracing.com -^> Ask Chief -^> "tune my car"
echo  Chief should now reference specific .sto files by name.
echo ================================================================
goto end

:cancel
echo Aborted before deployment. Nothing changed.

:end
echo.
pause
