@echo off
setlocal

REM ============================================================
REM  save-state.bat  —  Export extension state and commit to git
REM  Double-click to back up your Todo of the Loom data.
REM ============================================================

set "PROJECT_DIR=%~dp0"
set "DOWNLOADS=%USERPROFILE%\Downloads"
set "BACKUP_FILE=state-backup.json"
set "EXT_ID=ibobbkieoghidmojbdecjjdclfdiecae"

echo.
echo  ========================================
echo    Todo of the Loom — State Backup
echo  ========================================
echo.

REM Step 1: Open the export page in Chrome
echo  [1/4] Opening export page in Chrome...
start "" "chrome" "chrome-extension://%EXT_ID%/export-state.html"

REM Step 2: Wait for the download to complete
echo  [2/4] Waiting for state-backup.json to appear in Downloads...
set TRIES=0
:WAIT_LOOP
if exist "%DOWNLOADS%\%BACKUP_FILE%" goto FILE_FOUND
set /a TRIES+=1
if %TRIES% GEQ 15 (
    echo.
    echo  ERROR: state-backup.json not found after 15 seconds.
    echo  Make sure the extension is loaded and try again.
    echo.
    pause
    exit /b 1
)
timeout /t 1 /nobreak >nul
goto WAIT_LOOP

:FILE_FOUND
REM Small delay to ensure file is fully written
timeout /t 1 /nobreak >nul

REM Step 3: Copy to project folder
echo  [3/4] Copying backup to project folder...
move /Y "%DOWNLOADS%\%BACKUP_FILE%" "%PROJECT_DIR%%BACKUP_FILE%" >nul
if errorlevel 1 (
    echo  ERROR: Could not move file. Trying copy...
    copy /Y "%DOWNLOADS%\%BACKUP_FILE%" "%PROJECT_DIR%%BACKUP_FILE%" >nul
    del "%DOWNLOADS%\%BACKUP_FILE%" >nul 2>&1
)

REM Show file size
for %%A in ("%PROJECT_DIR%%BACKUP_FILE%") do echo  Backup size: %%~zA bytes

REM Step 4: Git commit
echo  [4/4] Committing to git...
cd /d "%PROJECT_DIR%"
git add "%BACKUP_FILE%"
git commit -m "State backup %date% %time:~0,5%"

echo.
echo  ========================================
echo    DONE — State backed up and committed
echo  ========================================
echo.
timeout /t 3 /nobreak >nul
