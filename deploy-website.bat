@echo off
cd /d "%~dp0"
echo ============================================
echo   Deploying Todo of the Loom website...
echo ============================================
echo.
echo This may take 1-2 minutes. Please wait...
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0deploy-hosting.ps1"
echo.
echo ============================================
echo   Done! Check above for results.
echo ============================================
echo.
echo Press any key to close.
pause >nul
