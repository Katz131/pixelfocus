@echo off
REM Compiles volume-host-wrapper.cs into volume-host.exe
REM This creates an invisible console app that pipes stdin/stdout to PowerShell
REM so the native messaging host doesn't flash a window.

set CSC=
for /f "delims=" %%i in ('where csc.exe 2^>nul') do set CSC=%%i
if "%CSC%"=="" (
  for /f "delims=" %%i in ('dir /s /b "%WINDIR%\Microsoft.NET\Framework64\v4*\csc.exe" 2^>nul') do set CSC=%%i
)
if "%CSC%"=="" (
  for /f "delims=" %%i in ('dir /s /b "%WINDIR%\Microsoft.NET\Framework\v4*\csc.exe" 2^>nul') do set CSC=%%i
)
if "%CSC%"=="" (
  echo ERROR: Could not find csc.exe. .NET Framework 4.x required.
  pause
  exit /b 1
)

echo Using: %CSC%
"%CSC%" /nologo /target:exe /out:"%~dp0volume-host.exe" "%~dp0volume-host-wrapper.cs"
if %ERRORLEVEL% NEQ 0 (
  echo Compilation failed.
  pause
  exit /b 1
)
echo.
echo SUCCESS: volume-host.exe created.
echo Now run setup-volume-host.bat to update the registry.
pause
