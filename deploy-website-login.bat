@echo off
echo ============================================
echo   Firebase Login
echo ============================================
echo   A browser window will open.
echo   Sign in with the Google account you used
echo   to set up Todo of the Loom.
echo ============================================
echo.
cd /d "%~dp0"

if not exist "firebase-tools-instant-win.exe" (
    echo Downloading Firebase CLI first...
    powershell -Command "Invoke-WebRequest -Uri 'https://firebase.tools/bin/win/instant/latest' -OutFile 'firebase-tools-instant-win.exe'"
    echo.
)

firebase-tools-instant-win.exe login
echo.
echo If login succeeded, now double-click deploy-website.bat
echo.
pause
