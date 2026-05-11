@echo off
title CHIEF — do everything to enable the new dashboard
color 0E

echo ================================================================
echo  CHIEF — three-step automatic enablement
echo  1) Open Supabase + SQL file so you can run the migration
echo  2) Push the new code to GitHub (auto-deploys to Vercel)
echo  3) Push your cached sessions + lap traces to the cloud
echo ================================================================
echo.

REM ----- Step 1: open Supabase + the SQL file side-by-side -----
echo [STEP 1/3] Opening Supabase SQL Editor and the migration SQL...
start "" "https://supabase.com/dashboard/project/gsxmzhvalmlzgyfbcnih/sql/new"
timeout /t 2 >nul
start "" notepad "%USERPROFILE%\Desktop\CHIEF-MIGRATE-TRACES.sql"
echo.
echo  - Notepad just opened with the SQL.  Ctrl-A then Ctrl-C to copy.
echo  - In Supabase (new browser tab), click in the editor, paste it, click Run.
echo  - You should see "Success" and a single row with current_rows=0.
echo.
choice /c YN /n /m "Done with the SQL step? [Y=continue / N=abort]: "
if errorlevel 2 goto cancel

echo.
echo ================================================================
echo  [STEP 2/3] Pushing new code to GitHub (Vercel auto-deploys)
echo ================================================================
cd /d "%USERPROFILE%\Desktop\chief-final-repo"

REM Clear any stale git locks
del .git\HEAD.lock .git\index.lock 2>nul

git --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: git not found in PATH.
    pause
    exit /b 1
)

REM Stage ONLY the new files we built for this feature
git add app/api/sessions/auto-capture-trace/route.ts
git add app/api/sessions/list/route.ts
git add "app/api/sessions/[id]/traces/route.ts"
git add app/dashboard/sessions/page.tsx
git add "app/dashboard/sessions/[id]/page.tsx"

echo.
echo Committing...
git commit -m "feat(sessions): add /dashboard/sessions list + detail with telemetry overlay + lap-traces API"
if errorlevel 1 (
    echo NOTE: nothing to commit (already committed) — moving on
)

echo.
echo Pushing to GitHub origin/main...
git push origin main
if errorlevel 1 (
    echo ERROR: push failed. Run `git push origin main` manually to see why.
    pause
    exit /b 1
)

echo.
echo  Pushed. Vercel is now building.  Watch:
echo    https://vercel.com/racer3553-9850s-projects/chief-final/deployments
echo.
echo  Waiting 100 seconds for the build to finish before we push traces...
timeout /t 100

echo.
echo ================================================================
echo  [STEP 3/3] Pushing your cached sessions + lap telemetry
echo ================================================================
cd /d "%USERPROFILE%\Desktop\chief-autocapture"
echo.
echo Pushing sessions...
python chief-push-cached.py --all
echo.
echo Pushing lap traces...
python chief-push-traces.py --all

echo.
echo ================================================================
echo  ALL DONE.
echo  Open: https://chiefracing.com/dashboard/sessions
echo  Click a row to see the Delta-style telemetry overlay.
echo ================================================================
goto end

:cancel
echo Aborted before deployment. Nothing changed.

:end
echo.
pause
