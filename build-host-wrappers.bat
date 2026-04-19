@echo off
REM ============================================================
REM  Build invisible native messaging host wrappers
REM  Compiles .cs wrappers into .exe files so BAT files
REM  don't flash a CMD window every time Chrome calls them.
REM ============================================================
setlocal EnableDelayedExpansion
echo.
echo ============================================================
echo   Building Native Host Wrappers
echo ============================================================
echo.

set "SCRIPT_DIR=%~dp0"
set "CSC="

REM --- Find csc.exe from .NET Framework ---
for %%d in (
    "%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
    "%WINDIR%\Microsoft.NET\Framework\v4.0.30319\csc.exe"
    "%WINDIR%\Microsoft.NET\Framework64\v3.5\csc.exe"
    "%WINDIR%\Microsoft.NET\Framework\v3.5\csc.exe"
) do (
    if exist %%d (
        set "CSC=%%~d"
        goto :FOUND_CSC
    )
)

echo [!!] Could not find csc.exe. .NET Framework 4.0 required.
echo      This is pre-installed on Windows 10/11.
goto :DONE

:FOUND_CSC
echo [OK] Found compiler: %CSC%
echo.

REM --- Compile volume-host-wrapper.exe ---
echo Compiling volume-host-wrapper.exe...
"%CSC%" /nologo /target:exe /out:"%SCRIPT_DIR%volume-host-wrapper.exe" "%SCRIPT_DIR%volume-host-wrapper.cs" >nul 2>&1
if exist "%SCRIPT_DIR%volume-host-wrapper.exe" (
    echo [OK] volume-host-wrapper.exe compiled successfully.
) else (
    echo [!!] Failed to compile volume-host-wrapper.exe
)

REM --- Compile cold-turkey-host-wrapper.exe ---
echo Compiling cold-turkey-host-wrapper.exe...
"%CSC%" /nologo /target:exe /out:"%SCRIPT_DIR%cold-turkey-host-wrapper.exe" "%SCRIPT_DIR%cold-turkey-host-wrapper.cs" >nul 2>&1
if exist "%SCRIPT_DIR%cold-turkey-host-wrapper.exe" (
    echo [OK] cold-turkey-host-wrapper.exe compiled successfully.
) else (
    echo [!!] Failed to compile cold-turkey-host-wrapper.exe
)

REM --- Update native messaging manifests to point at .exe files ---
echo.
echo Updating native messaging manifests...

REM Volume manifest
if exist "%SCRIPT_DIR%volume-host-wrapper.exe" (
    set "VOL_PATH=%SCRIPT_DIR:\=\\%volume-host-wrapper.exe"
    echo [OK] Volume manifest will use: volume-host-wrapper.exe
) else (
    set "VOL_PATH=%SCRIPT_DIR:\=\\%volume-host.bat"
    echo [!!] Volume manifest keeping: volume-host.bat (no exe)
)

REM Read existing volume manifest to get allowed_origins
REM Just rebuild with known IDs
(
echo {
echo   "name": "com.todooftheloom.volume",
echo   "description": "Volume control bridge for Todo of the Loom",
echo   "path": "!VOL_PATH!",
echo   "type": "stdio",
echo   "allowed_origins": [
echo     "chrome-extension://ibobbkieoghidmojbdecjjdclfdiecae/",
echo     "chrome-extension://jlfiokfngdjebicfaagoeiciihbfeeil/"
echo   ]
echo }
) > "%SCRIPT_DIR%com.todooftheloom.volume.json"

REM Cold Turkey manifest
if exist "%SCRIPT_DIR%cold-turkey-host-wrapper.exe" (
    set "CT_PATH=%SCRIPT_DIR:\=\\%cold-turkey-host-wrapper.exe"
    echo [OK] Cold Turkey manifest will use: cold-turkey-host-wrapper.exe
) else (
    set "CT_PATH=%SCRIPT_DIR:\=\\%cold-turkey-host.bat"
    echo [!!] Cold Turkey manifest keeping: cold-turkey-host.bat (no exe)
)

(
echo {
echo   "name": "com.todooftheloom.coldturkey",
echo   "description": "Cold Turkey bridge for Todo of the Loom",
echo   "path": "!CT_PATH!",
echo   "type": "stdio",
echo   "allowed_origins": [
echo     "chrome-extension://ibobbkieoghidmojbdecjjdclfdiecae/",
echo     "chrome-extension://jlfiokfngdjebicfaagoeiciihbfeeil/"
echo   ]
echo }
) > "%SCRIPT_DIR%com.todooftheloom.coldturkey.json"

echo.
echo ============================================================
echo   DONE! Both wrappers compiled and manifests updated.
echo   Reload the extension for changes to take effect.
echo ============================================================
echo.

:DONE
echo Press any key to close...
pause >nul
endlocal
