@echo off
title Find Coach Dave folder
color 0B
echo Searching for Coach Dave Delta data folders...
echo.

echo === Standard Documents paths ===
for %%D in (
    "%USERPROFILE%\Documents\Coach Dave Academy"
    "%USERPROFILE%\Documents\CoachDaveDelta"
    "%USERPROFILE%\Documents\Coach Dave Delta"
    "%USERPROFILE%\Documents\Delta"
) do if exist %%D echo FOUND: %%D & dir /s /b %%D 2>nul | findstr /i "\.cdd \.sto \.json" | findstr /v node_modules | head -10

echo.
echo === AppData paths ===
for %%D in (
    "%APPDATA%\Coach Dave Delta"
    "%APPDATA%\CoachDaveDelta"
    "%APPDATA%\Coach Dave Academy"
    "%APPDATA%\delta"
    "%APPDATA%\@coachdaveacademy"
    "%LOCALAPPDATA%\Coach Dave Delta"
    "%LOCALAPPDATA%\Coach Dave Academy"
    "%LOCALAPPDATA%\Programs\Coach Dave Delta"
) do if exist %%D echo FOUND: %%D

echo.
echo === Searching iRacing setups for Coach Dave files ===
if exist "%USERPROFILE%\Documents\iRacing\setups" (
    dir /s /b "%USERPROFILE%\Documents\iRacing\setups\*.sto" 2>nul | findstr /i "coach dave delta cda" | head -20
)

echo.
echo === Brute force scan ===
echo Looking anywhere for *.cdd files (Coach Dave format)...
where /R "%USERPROFILE%" *.cdd 2>nul | head -20

echo.
echo Done. Tell Claude any FOUND paths above so it can update vendors.py.
pause
