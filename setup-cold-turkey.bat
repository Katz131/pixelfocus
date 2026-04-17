@echo off
REM ============================================================
REM  Setup Cold Turkey bridge for Todo of the Loom
REM
REM  Double-click this file ONCE to register the native
REM  messaging host so the extension can talk to Cold Turkey.
REM
REM  This adds a registry key that tells Chrome/Brave where
REM  the native messaging manifest lives. Safe to run again.
REM ============================================================

setlocal
echo.
echo ============================================================
echo   Cold Turkey Bridge Setup
echo ============================================================
echo.

set "MANIFEST_PATH=%~dp0com.todooftheloom.coldturkey.json"

REM Register for Chrome
reg add "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.todooftheloom.coldturkey" /ve /t REG_SZ /d "%MANIFEST_PATH%" /f >nul 2>&1
if %errorlevel%==0 (
    echo [OK] Registered for Google Chrome.
) else (
    echo [!!] Could not register for Chrome.
)

REM Register for Brave (uses same registry path as Chromium)
reg add "HKCU\Software\BraveSoftware\Brave-Browser\NativeMessagingHosts\com.todooftheloom.coldturkey" /ve /t REG_SZ /d "%MANIFEST_PATH%" /f >nul 2>&1
if %errorlevel%==0 (
    echo [OK] Registered for Brave Browser.
) else (
    echo [!!] Could not register for Brave.
)

REM Register for generic Chromium
reg add "HKCU\Software\Chromium\NativeMessagingHosts\com.todooftheloom.coldturkey" /ve /t REG_SZ /d "%MANIFEST_PATH%" /f >nul 2>&1
if %errorlevel%==0 (
    echo [OK] Registered for Chromium.
) else (
    echo [!!] Could not register for Chromium.
)

echo.
echo ============================================================
echo   DONE! The Cold Turkey bridge is now registered.
echo.
echo   Next steps:
echo   1. Reload the extension in Brave (brave://extensions)
echo   2. Open Todo of the Loom
echo   3. Go to Settings and enable "Cold Turkey Integration"
echo   4. Start a focus session - Cold Turkey will activate!
echo ============================================================
echo.
echo Press any key to close...
pause >nul
endlocal
