@echo off
REM ============================================================
REM  Todo of the Loom — Update Script
REM
REM  Double-click this to get the latest version.
REM  After it finishes, reload the extension in your browser:
REM    1. Go to brave://extensions (or chrome://extensions)
REM    2. Click the reload arrow on Todo of the Loom
REM ============================================================

cd /d "%~dp0"

echo.
echo  Updating Todo of the Loom...
echo.

REM ---- Locate git.exe ----
set "GIT_EXE="
if exist "C:\Program Files\Git\cmd\git.exe" set "GIT_EXE=C:\Program Files\Git\cmd\git.exe"
if not defined GIT_EXE if exist "C:\Program Files (x86)\Git\cmd\git.exe" set "GIT_EXE=C:\Program Files (x86)\Git\cmd\git.exe"
if not defined GIT_EXE if exist "%LOCALAPPDATA%\Programs\Git\cmd\git.exe" set "GIT_EXE=%LOCALAPPDATA%\Programs\Git\cmd\git.exe"
if not defined GIT_EXE (
    for /f "usebackq delims=" %%G in (`where git 2^>nul`) do if not defined GIT_EXE set "GIT_EXE=%%G"
)
if not defined GIT_EXE (
    echo  ERROR: Git is not installed.
    echo  Ask your partner to help install it.
    echo.
    pause
    exit /b 1
)

"%GIT_EXE%" pull origin main
if errorlevel 1 (
    echo.
    echo  Something went wrong. Screenshot this and send it over.
    echo.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  Updated! Now reload the extension in your browser:
echo.
echo    1. Go to brave://extensions
echo    2. Find "Todo of the Loom"
echo    3. Click the little reload arrow
echo ============================================================
echo.
pause
