@echo off
REM ============================================================
REM  Setup Volume Control bridge for Todo of the Loom
REM
REM  Double-click this file ONCE to register the native
REM  messaging host so the extension can mute/unmute volume.
REM
REM  This adds a registry key that tells Chrome/Brave where
REM  the native messaging manifest lives. Safe to run again.
REM ============================================================

setlocal EnableDelayedExpansion
echo.
echo ============================================================
echo   Volume Control Bridge Setup
echo ============================================================
echo.

set "SCRIPT_DIR=%~dp0"
set "MANIFEST_PATH=%SCRIPT_DIR%com.todooftheloom.volume.json"

REM --- Build .exe wrapper if not already compiled ---
if not exist "%SCRIPT_DIR%volume-host.exe" (
  echo volume-host.exe not found — compiling...
  echo.
  set CSC=
  for /f "delims=" %%i in ('where csc.exe 2^>nul') do set CSC=%%i
  if "!CSC!"=="" (
    for /f "delims=" %%i in ('dir /s /b "%WINDIR%\Microsoft.NET\Framework64\v4*\csc.exe" 2^>nul') do set CSC=%%i
  )
  if "!CSC!"=="" (
    for /f "delims=" %%i in ('dir /s /b "%WINDIR%\Microsoft.NET\Framework\v4*\csc.exe" 2^>nul') do set CSC=%%i
  )
  if "!CSC!"=="" (
    echo [!!] Could not find csc.exe. .NET Framework 4.x required.
    echo      Falling back to volume-host.bat — PowerShell window may flash.
    set "HOST_EXE=volume-host.bat"
    goto :write_manifest
  )
  echo Using: !CSC!
  "!CSC!" /nologo /target:exe /out:"%SCRIPT_DIR%volume-host.exe" "%SCRIPT_DIR%volume-host-wrapper.cs"
  if !ERRORLEVEL! NEQ 0 (
    echo [!!] Compilation failed. Falling back to volume-host.bat.
    set "HOST_EXE=volume-host.bat"
    goto :write_manifest
  )
  echo [OK] volume-host.exe compiled successfully.
  echo.
)

if exist "%SCRIPT_DIR%volume-host.exe" (
  set "HOST_EXE=volume-host.exe"
) else (
  set "HOST_EXE=volume-host.bat"
)

:write_manifest
REM --- Update manifest with correct path ---
echo Updating native messaging manifest...

(
echo {
echo   "name": "com.todooftheloom.volume",
echo   "description": "Volume control bridge for Todo of the Loom",
echo   "path": "%SCRIPT_DIR:\=\\%!HOST_EXE!",
echo   "type": "stdio",
echo   "allowed_origins": [
echo     "chrome-extension://ibobbkieoghidmojbdecjjdclfdiecae/",
echo     "chrome-extension://jlfiokfngdjebicfaagoeiciihbfeeil/"
echo   ]
echo }
) > "%MANIFEST_PATH%"

echo [OK] Manifest written — using !HOST_EXE!

REM Register for Chrome
reg add "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.todooftheloom.volume" /ve /t REG_SZ /d "%MANIFEST_PATH%" /f >nul 2>&1
if %errorlevel%==0 (
    echo [OK] Registered for Google Chrome.
) else (
    echo [!!] Could not register for Chrome.
)

REM Register for Brave
reg add "HKCU\Software\BraveSoftware\Brave-Browser\NativeMessagingHosts\com.todooftheloom.volume" /ve /t REG_SZ /d "%MANIFEST_PATH%" /f >nul 2>&1
if %errorlevel%==0 (
    echo [OK] Registered for Brave Browser.
) else (
    echo [!!] Could not register for Brave.
)

REM Register for Chromium
reg add "HKCU\Software\Chromium\NativeMessagingHosts\com.todooftheloom.volume" /ve /t REG_SZ /d "%MANIFEST_PATH%" /f >nul 2>&1
if %errorlevel%==0 (
    echo [OK] Registered for Chromium.
) else (
    echo [!!] Could not register for Chromium.
)

echo.
echo ============================================================
echo   DONE! The volume control bridge is now registered.
echo.
echo   Next steps:
echo   1. Reload the extension in Brave (brave://extensions)
echo   2. Open Settings and scroll to Volume Mute Scheduler
echo   3. Click TEST MUTE - your audio should mute for 5 seconds
echo ============================================================
echo.
echo Press any key to close...
pause >nul
endlocal
