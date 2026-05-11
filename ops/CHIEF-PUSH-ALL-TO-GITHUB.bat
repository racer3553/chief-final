@echo off
title CHIEF — push every critical file to GitHub
color 0A

echo ================================================================
echo  CHIEF - sync ALL critical work to GitHub
echo  github.com/racer3553/chief-final
echo ================================================================
echo.
echo  This pushes:
echo    1) Every web-app change since the last commit
echo       (dashboard pages, API routes, sidebar, AI route, recharts)
echo    2) The Python desktop daemon (chief-autocapture\)
echo       copied into chief-final-repo\desktop\ so it's all in
echo       ONE git history. Vercel ignores that folder for builds.
echo    3) The .bat launchers + SQL migrations
echo       (copied into chief-final-repo\ops\)
echo ================================================================
echo.

cd /d "%USERPROFILE%\Desktop\chief-final-repo"

REM Clear stale git locks
del .git\HEAD.lock .git\index.lock 2>nul

git --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: git not found in PATH. Install Git for Windows from https://git-scm.com/download/win
    pause
    exit /b 1
)

echo [1/4] Mirroring desktop Python scripts into chief-final-repo\desktop\
if not exist desktop mkdir desktop
xcopy /Y /I /Q "%USERPROFILE%\Desktop\chief-autocapture\*.py"   desktop\  >nul
xcopy /Y /I /Q "%USERPROFILE%\Desktop\chief-autocapture\*.bat"  desktop\  >nul 2>&1
xcopy /Y /I /Q "%USERPROFILE%\Desktop\chief-autocapture\*.html" desktop\  >nul 2>&1
xcopy /Y /I /Q "%USERPROFILE%\Desktop\chief-autocapture\*.md"   desktop\  >nul 2>&1
xcopy /Y /I /Q "%USERPROFILE%\Desktop\chief-autocapture\*.json" desktop\  >nul 2>&1
echo     done.

echo.
echo [2/4] Mirroring Desktop bat launchers + SQL files into chief-final-repo\ops\
if not exist ops mkdir ops
xcopy /Y /I /Q "%USERPROFILE%\Desktop\CHIEF-*.bat"    ops\ >nul 2>&1
xcopy /Y /I /Q "%USERPROFILE%\Desktop\CHIEF-*.sql"    ops\ >nul 2>&1
xcopy /Y /I /Q "%USERPROFILE%\Desktop\CHIEF-*.txt"    ops\ >nul 2>&1
xcopy /Y /I /Q "%USERPROFILE%\Desktop\DISABLE-*.bat"  ops\ >nul 2>&1
xcopy /Y /I /Q "%USERPROFILE%\Desktop\UPDATE-*.bat"   ops\ >nul 2>&1
echo     done.

echo.
echo [3/4] Showing what git sees:
echo ----------------------------------------------------------------
git status --short
echo ----------------------------------------------------------------
echo.

choice /c YN /n /m "Commit and push all of the above to GitHub? [Y/N]: "
if errorlevel 2 goto cancel

echo.
echo [4/4] Committing + pushing...
git add -A
git commit -m "chore: full sync — desktop daemon, ops scripts, latest web app changes"
if errorlevel 1 (
    echo NOTE: nothing to commit (already in sync) or commit failed.
)

git push origin main
if errorlevel 1 (
    echo.
    echo ERROR: push failed. Common causes:
    echo   - Need to authenticate (run "git push origin main" manually to see prompt)
    echo   - GitHub branch protection rules
    echo   - Merge conflict (someone else pushed since last pull)
    echo.
    pause
    exit /b 1
)

echo.
echo ================================================================
echo  PUSHED. GitHub now has:
echo    - Every web-app change
echo    - chief-final-repo\desktop\  (every .py, .bat, .html for the daemon)
echo    - chief-final-repo\ops\      (every SQL migration + ops bat)
echo
echo  Vercel will auto-deploy from the new commit. New URL:
echo    https://vercel.com/racer3553-9850s-projects/chief-final/deployments
echo
echo  Repo:  https://github.com/racer3553/chief-final
echo ================================================================
goto end

:cancel
echo Aborted. Nothing pushed.

:end
echo.
pause
