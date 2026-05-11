@echo off
title CHIEF — Deploy chief-final to Vercel directly (CLI)
color 0E
cd /d "%USERPROFILE%\Desktop\chief-final-repo"

echo ================================================================
echo  CHIEF — direct Vercel deploy (skips GitHub auto-deploy)
echo ================================================================
echo.
echo  Use this when Vercel's GitHub webhook isn't picking up new
echo  commits. Pushes the current local code directly to production.
echo.
echo  First run only: you'll be prompted to log in (browser opens).
echo  After that, it just deploys.
echo.
echo ================================================================
echo.

REM Check Node/npx
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed. Install from https://nodejs.org
    pause
    exit /b 1
)

REM Use npx so we don't need a global Vercel CLI install
echo Running: npx vercel --prod --yes
echo.
npx --yes vercel --prod --yes

echo.
echo ================================================================
echo  Deploy finished. Note the URL above.
echo  After it goes live, run CHIEF-PUSH-CACHED.bat -> P
echo ================================================================
pause
