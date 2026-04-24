@echo off
REM ============================================================
REM  Todo of the Loom — Update Script (no Git required)
REM
REM  Double-click this to get the latest version.
REM  Your progress, tasks, coins, and streaks are SAFE.
REM  They live in Chrome's storage, not in these files.
REM
REM  After it finishes, reload the extension in your browser:
REM    1. Go to chrome://extensions (or brave://extensions)
REM    2. Click the reload arrow on Todo of the Loom
REM ============================================================

cd /d "%~dp0"

echo.
echo  ============================================
echo   Todo of the Loom — Updater
echo  ============================================
echo.
echo  Your progress is SAFE. This only updates
echo  the code files, not your saved data.
echo.

REM ---- Check for curl (built into Windows 10+) ----
where curl >nul 2>&1
if errorlevel 1 (
    echo  ERROR: curl not found. You need Windows 10 or newer.
    echo  Screenshot this and send it over.
    pause
    exit /b 1
)

REM ---- Check for tar (built into Windows 10+) ----
where tar >nul 2>&1
if errorlevel 1 (
    echo  ERROR: tar not found. You need Windows 10 or newer.
    echo  Screenshot this and send it over.
    pause
    exit /b 1
)

echo  Downloading latest version from GitHub...
echo.

REM ---- Download the latest main branch as zip ----
curl -L -o "%TEMP%\pixelfocus-update.zip" "https://github.com/Katz131/pixelfocus/archive/refs/heads/main.zip" 2>nul
if errorlevel 1 (
    echo  ERROR: Download failed. Check your internet connection.
    echo  Screenshot this and send it over.
    pause
    exit /b 1
)

REM ---- Check the zip isn't empty / error page ----
for %%A in ("%TEMP%\pixelfocus-update.zip") do (
    if %%~zA LSS 10000 (
        echo  ERROR: Downloaded file is too small — might be a GitHub error.
        echo  Screenshot this and send it over.
        del "%TEMP%\pixelfocus-update.zip" 2>nul
        pause
        exit /b 1
    )
)

echo  Extracting...

REM ---- Clean old temp extract if it exists ----
if exist "%TEMP%\pixelfocus-extract" rmdir /s /q "%TEMP%\pixelfocus-extract"
mkdir "%TEMP%\pixelfocus-extract"

REM ---- Extract zip ----
tar -xf "%TEMP%\pixelfocus-update.zip" -C "%TEMP%\pixelfocus-extract" 2>nul
if errorlevel 1 (
    echo  ERROR: Failed to extract the update.
    echo  Screenshot this and send it over.
    del "%TEMP%\pixelfocus-update.zip" 2>nul
    pause
    exit /b 1
)

REM ---- GitHub zips extract to a subfolder like pixelfocus-main ----
REM ---- Find that folder and copy everything over ----
set "SRCDIR="
for /d %%D in ("%TEMP%\pixelfocus-extract\*") do set "SRCDIR=%%D"

if not defined SRCDIR (
    echo  ERROR: Could not find extracted files.
    echo  Screenshot this and send it over.
    del "%TEMP%\pixelfocus-update.zip" 2>nul
    rmdir /s /q "%TEMP%\pixelfocus-extract" 2>nul
    pause
    exit /b 1
)

echo  Updating files...

REM ---- Copy all files from extracted folder to current folder ----
REM ---- /Y = overwrite without asking, /E = include subdirectories ----
xcopy "%SRCDIR%\*" "%~dp0" /Y /E /Q >nul 2>&1

echo.
echo  Cleaning up...
del "%TEMP%\pixelfocus-update.zip" 2>nul
rmdir /s /q "%TEMP%\pixelfocus-extract" 2>nul

REM ---- Show the new version ----
for /f "tokens=2 delims=:" %%V in ('findstr /c:"\"version\"" "%~dp0manifest.json"') do (
    set "VER=%%V"
)

echo.
echo  ============================================
echo   UPDATED SUCCESSFULLY!
echo.
echo   Now reload the extension:
echo     1. Go to chrome://extensions
echo     2. Find "Todo of the Loom"
echo     3. Click the little reload arrow
echo.
echo   Your tasks, coins, and streaks are safe.
echo  ============================================
echo.
pause
