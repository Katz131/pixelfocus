@echo off
REM ============================================================
REM PixelFocus extension packager (double-click to run)
REM
REM Just double-click this file in File Explorer.
REM It will create "pixelfocus-v3.19.10.zip" right next to itself
REM in this same folder. Send that zip to your friend.
REM
REM This script ONLY reads source files and writes a zip.
REM It does NOT touch Chrome, your extension data, tasks,
REM bundles, gallery progress, or factory progress.
REM ============================================================

setlocal
cd /d "%~dp0"

echo.
echo ============================================================
echo   PixelFocus packager
echo   Working in: %CD%
echo ============================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop';" ^
  "$src = (Get-Location).Path;" ^
  "$version = '3.19.10';" ^
  "$staging = Join-Path $env:TEMP ('pixelfocus-build-' + [Guid]::NewGuid().ToString('N'));" ^
  "$outZip = Join-Path $src ('pixelfocus-v' + $version + '.zip');" ^
  "New-Item -ItemType Directory -Path $staging -Force | Out-Null;" ^
  "$stagingIcons = Join-Path $staging 'icons';" ^
  "New-Item -ItemType Directory -Path $stagingIcons -Force | Out-Null;" ^
  "$files = @('manifest.json','background.js','popup.html','app.js','gallery.html','gallery.js','factory.html','factory.js','stage-entries.js','msglog.js','sounds.js','tips.js','tooltip.js','fonts.css');" ^
  "foreach ($f in $files) { $full = Join-Path $src $f; if (Test-Path $full) { Copy-Item -LiteralPath $full -Destination (Join-Path $staging $f); Write-Host ('  + ' + $f) } else { Write-Host ('  - ' + $f + ' (missing, skipped)') -ForegroundColor Yellow } };" ^
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
    echo   %~dp0pixelfocus-v3.19.10.zip
    echo.
    echo That is the file to send to your friend.
    echo.
)

echo Press any key to close this window...
pause >nul
endlocal
