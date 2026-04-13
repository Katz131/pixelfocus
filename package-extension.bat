@echo off
REM ============================================================
REM PixelFocus extension packager (double-click to run)
REM
REM Reads the version from manifest.json, stages every file
REM that ships in the extension, and produces a zip suitable
REM for the Chrome Web Store or manual distribution.
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
  "$files = @(" ^
    "'manifest.json','background.js','popup.html','app.js'," ^
    "'gallery.html','gallery.js','factory.html','factory.js'," ^
    "'house.html','house.js','house-window.js','house-dispatch.js'," ^
    "'popup-dispatch.js','ratiocinatory.html','ratiocinatory.js'," ^
    "'incinerator.html','incinerator.js','incinerator-window.js'," ^
    "'employees.html','employees.js','research.html','research-window.js'," ^
    "'personnel.js','research.js'," ^
    "'stage-entries.js','msglog.js','sounds.js','tips.js'," ^
    "'tooltip.js','fonts.css'" ^
  ");" ^
  "foreach ($f in $files) { $full = Join-Path $src $f; if (Test-Path $full) { Copy-Item -LiteralPath $full -Destination (Join-Path $stageDir $f); Write-Host ('  + ' + $f) } else { Write-Host ('  - ' + $f + ' (missing, skipped)') -ForegroundColor Yellow } };" ^
  "$iconDir = Join-Path $src 'icons';" ^
  "if (Test-Path $iconDir) { $pngs = Get-ChildItem -Path $iconDir -Filter '*.png'; foreach ($p in $pngs) { $dest = Join-Path $stagingIcons $p.Name; Copy-Item -LiteralPath $p.FullName -Destination $dest; Write-Host ('  + icons/' + $p.Name) } };" ^
  "if (Test-Path $outZip) { Remove-Item -LiteralPath $outZip -Force };" ^
  "Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $outZip -CompressionLevel Optimal;" ^
  "Remove-Item -LiteralPath $staging -Recurse -Force;" ^
  "if (Test-Path $outZip) { $sizeKb = [math]::Round((Get-Item $outZip).Length / 1KB, 1); Write-Host ''; Write-Host '============================================================' -ForegroundColor Green; Write-Host ('  DONE! Packaged: ' + $outZip) -ForegroundColor Green; Write-Host ('  Size: ' + $sizeKb + ' KB') -ForegroundColor Green; Write-Host '============================================================' -ForegroundColor Green } else { Write-Host 'ERROR: zip was not created.' -ForegroundColor Red; exit 1 }"

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
