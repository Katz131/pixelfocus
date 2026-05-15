@echo off
echo ============================================
echo   Deploying Firestore Security Rules
echo   Project: todo-of-the-loom
echo ============================================
echo.

cd /d "%~dp0"

echo Deploying firestore.rules...
firebase-tools-instant-win.exe deploy --only firestore:rules

echo.
if %ERRORLEVEL% EQU 0 (
    echo ============================================
    echo   SUCCESS! Rules deployed.
    echo   Your database will keep working.
    echo ============================================
) else (
    echo ============================================
    echo   SOMETHING WENT WRONG.
    echo   Screenshot this window and send to Claude.
    echo ============================================
)

echo.
pause
