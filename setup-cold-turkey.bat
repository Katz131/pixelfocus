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

setlocal EnableDelayedExpansion
echo.
echo ============================================================
echo   Cold Turkey Bridge Setup
echo ============================================================
echo.

set "SCRIPT_DIR=%~dp0"
set "MANIFEST_PATH=%SCRIPT_DIR%com.todooftheloom.coldturkey.json"

REM --- Ask for extension ID ---
echo Your extension ID is shown in the Todo of the Loom
echo Settings page under "Cold Turkey Integration".
echo.
echo If you don't know it, open the extension, go to
echo Settings, and look for "Your extension ID: xxxxxxx".
echo.
echo Or find it at brave://extensions (or chrome://extensions).
echo.
set /p EXT_ID="Paste your extension ID here: "

if "%EXT_ID%"=="" (
    echo [!!] No extension ID entered. Using defaults only.
    goto :SKIP_JSON_UPDATE
)

REM --- Update the native messaging manifest with the extension ID ---
echo.
echo Updating native messaging manifest...

REM Build the JSON file with the user's extension ID + known IDs
(
echo {
echo   "name": "com.todooftheloom.coldturkey",
echo   "description": "Cold Turkey bridge for Todo of the Loom",
echo   "path": "%SCRIPT_DIR:\=\\%cold-turkey-host.bat",
echo   "type": "stdio",
echo   "allowed_origins": [
echo     "chrome-extension://%EXT_ID%/",
echo     "chrome-extension://jlfiokfngdjebicfaagoeiciihbfeeil/"
echo   ]
echo }
) > "%MANIFEST_PATH%"

echo [OK] Manifest updated with extension ID: %EXT_ID%

:SKIP_JSON_UPDATE

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
echo   3. Go to Settings and enable Cold Turkey features
echo   4. Click "OPEN COLD TURKEY" when prompted - it should work!
echo ============================================================
echo.
echo Press any key to close...
pause >nul
endlocal
