@echo off
REM ============================================================
REM PixelFocus release-to-GitHub button
REM
REM Double-click this file after Claude has updated the version
REM numbers. It will:
REM   1. Read the version from manifest.json
REM   2. Commit all pending changes
REM   3. Create a v<version> tag
REM   4. Push everything to GitHub
REM
REM GitHub Actions will then automatically build the zip and
REM publish a new Release. The landing page's Download button
REM will pick up the new version on its own.
REM ============================================================

setlocal EnableDelayedExpansion
cd /d "%~dp0"

echo.
echo ============================================================
echo   PixelFocus release button
echo ============================================================
echo.

REM ---- Pull version out of manifest.json via PowerShell ----
for /f "usebackq delims=" %%V in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "(Get-Content -Raw manifest.json | ConvertFrom-Json).version"`) do set VERSION=%%V

if "%VERSION%"=="" (
    echo ERROR: Could not read version from manifest.json.
    echo Press any key to close...
    pause >nul
    exit /b 1
)

echo Detected version: v%VERSION%
echo.

REM ---- Stage and commit any changes ----
echo Staging changes...
git add -A
if errorlevel 1 goto :fail

REM Only commit if there are staged changes
git diff --cached --quiet
if errorlevel 1 (
    echo Committing...
    git commit -m "Release v%VERSION%"
    if errorlevel 1 goto :fail
) else (
    echo No new file changes to commit. Tag-only release.
)

REM ---- Create tag (skip if it already exists) ----
git rev-parse -q --verify "refs/tags/v%VERSION%" >nul
if errorlevel 1 (
    echo Creating tag v%VERSION%...
    git tag -a "v%VERSION%" -m "PixelFocus v%VERSION%"
    if errorlevel 1 goto :fail
) else (
    echo Tag v%VERSION% already exists locally, skipping create.
)

REM ---- Push main ----
echo Pushing main branch...
git push origin main
if errorlevel 1 goto :fail

REM ---- Push tag ----
echo Pushing tag v%VERSION%...
git push origin "v%VERSION%"
if errorlevel 1 goto :fail

echo.
echo ============================================================
echo   DONE! Released v%VERSION% to GitHub.
echo.
echo   GitHub Actions is now building the zip in the background.
echo   Watch it here:
echo   https://github.com/Katz131/pixelfocus/actions
echo ============================================================
echo.
echo Press any key to close...
pause >nul
endlocal
exit /b 0

:fail
echo.
echo ============================================================
echo   Something went wrong. Look at the messages above.
echo ============================================================
echo.
echo Press any key to close...
pause >nul
endlocal
exit /b 1
