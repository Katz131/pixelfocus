@echo off
REM ============================================================
REM PixelFocus extension packager (double-click to run)
REM
REM Reads the version from manifest.json, stages every file
REM that ships in the extension, and produces a zip suitable
REM for the Chrome Web Store or manual distribution.
REM
REM v3.23.33: Now auto-includes ALL .html, .js, .css, .bat,
REM and .json files instead of a hardcoded list. No more
REM forgetting to add new files.
REM
REM This script ONLY reads source files and writes a zip.
REM It does NOT touch Chrome, your extension data, tasks,
REM bundles, gallery progress, or factory progress.
REM ============================================================

setlocal EnableDelayedExpansion
cd /d "%~dp0"

echo.
echo ============================================================
echo   PixelFocus packager
echo   Working in: %CD%
echo ============================================================
echo.

REM ---- Read version from manifest.json via PowerShell ----
for /f "usebackq delims=" %%V in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "(Get-Content -Raw manifest.json | ConvertFrom-Json).version"`) do set VERSION=%%V

if "%VERSION%"=="" (
    echo ERROR: Could not read version from manifest.json.
    echo Press any key to close...
    pause >nul
    exit /b 1
)

echo Detected version: v%VERSION%
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop';" ^
  "$src = (Get-Location).Path;" ^
  "$version = '%VERSION%';" ^
  "$staging = Join-Path $env:TEMP ('pixelfocus-build-' + [Guid]::NewGuid().ToString('N'));" ^
  "$stageDir = Join-Path $staging 'pixelfocus';" ^
  "$outZip = Join-Path $src ('pixelfocus-v' + $version + '.zip');" ^
  "New-Item -ItemType Directory -Path $stageDir -Force | Out-Null;" ^
  "$stagingIcons = Join-Path $stageDir 'icons';" ^
  "New-Item -ItemType Directory -Path $stagingIcons -Force | Out-Null;" ^
  "" ^
  "# Auto-include all extension files by type" ^
  "$extensions = @('*.html','*.js','*.css','*.json','*.bat');" ^
  "# Exclude dev-only and git files" ^
  "$exclude = @('.git','.gitignore','node_modules','firebase-hosting','scratch','*.local','*.local.*','package-lock.json','background_new.js');" ^
  "" ^
  "foreach ($ext in $extensions) {" ^
  "  $found = Get-ChildItem -Path $src -Filter $ext -File -ErrorAction SilentlyContinue;" ^
  "  foreach ($f in $found) {" ^
  "    $skip = $false;" ^
  "    foreach ($ex in $exclude) {" ^
  "      if ($f.Name -like $ex) { $skip = $true; break }" ^
  "    }" ^
  "    if (-not $skip) {" ^
  "      Copy-Item -LiteralPath $f.FullName -Destination (Join-Path $stageDir $f.Name);" ^
  "      Write-Host ('  + ' + $f.Name)" ^
  "    }" ^
  "  }" ^
  "}" ^
  "" ^
  "# Copy icons" ^
  "$iconDir = Join-Path $src 'icons';" ^
  "if (Test-Path $iconDir) {" ^
  "  $pngs = Get-ChildItem -Path $iconDir -Filter '*.png';" ^
  "  foreach ($p in $pngs) {" ^
  "    Copy-Item -LiteralPath $p.FullName -Destination (Join-Path $stagingIcons $p.Name);" ^
  "    Write-Host ('  + icons/' + $p.Name)" ^
  "  }" ^
  "}" ^
  "" ^
  "# Copy fonts directory if it exists" ^
  "$fontDir = Join-Path $src 'fonts';" ^
  "if (Test-Path $fontDir) {" ^
  "  $stagingFonts = Join-Path $stageDir 'fonts';" ^
  "  New-Item -ItemType Directory -Path $stagingFonts -Force | Out-Null;" ^
  "  Get-ChildItem -Path $fontDir -File | ForEach-Object {" ^
  "    Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $stagingFonts $_.Name);" ^
  "    Write-Host ('  + fonts/' + $_.Name)" ^
  "  }" ^
  "}" ^
  "" ^
  "if (Test-Path $outZip) { Remove-Item -LiteralPath $outZip -Force };" ^
  "Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $outZip -CompressionLevel Optimal;" ^
  "Remove-Item -LiteralPath $staging -Recurse -Force;" ^
  "if (Test-Path $outZip) {" ^
  "  $sizeKb = [math]::Round((Get-Item $outZip).Length / 1KB, 1);" ^
  "  Write-Host '';" ^
  "  Write-Host '============================================================' -ForegroundColor Green;" ^
  "  Write-Host ('  DONE! Packaged: ' + $outZip) -ForegroundColor Green;" ^
  "  Write-Host ('  Size: ' + $sizeKb + ' KB') -ForegroundColor Green;" ^
  "  Write-Host '============================================================' -ForegroundColor Green" ^
  "} else {" ^
  "  Write-Host 'ERROR: zip was not created.' -ForegroundColor Red; exit 1" ^
  "}"

if errorlevel 1 (
    echo.
    echo ============================================================
    echo   Something went wrong. See the messages above.
    echo ============================================================
    echo.
) else (
    echo.
    echo The zip file is now sitting in this same folder:
    echo   %~dp0pixelfocus-v%VERSION%.zip
    echo.
    echo Upload this zip to the Chrome Web Store Developer Console
    echo or send it to someone for manual installation.
    echo.
)

echo Press any key to close this window...
pause >nul
endlocal
