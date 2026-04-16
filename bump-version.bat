@echo off
REM ============================================================
REM PixelFocus version bumper.
REM
REM Usage:
REM   bump-version.bat           -> auto-bumps PATCH (x.y.Z -> x.y.Z+1)
REM   bump-version.bat 3.20.27   -> sets version to 3.20.27
REM   bump-version.bat minor     -> x.Y.z  -> x.Y+1.0
REM   bump-version.bat major     -> X.y.z  -> X+1.0.0
REM
REM This script is the ONLY supported way to change the version.
REM Do NOT hand-edit version strings — use this script every time.
REM
REM It updates exactly five files and then VERIFIES every one
REM by reading it back. If a single file fails, the script exits
REM non-zero with a loud error so the mistake cannot be missed.
REM
REM Files managed:
REM   1. manifest.json          ("version": "X.Y.Z")     Chrome source of truth
REM   2. app.js                 header comment (vX.Y.Z)
REM   3. popup.html             displayed title-bar badge vX.Y.Z
REM   4. factory.html           "vX.Y.Z . Loom Edition" badge
REM   5. fonts.css              header comment (vX.Y.Z)
REM
REM package-extension.bat is NOT in the list because it already
REM reads the version from manifest.json at build time.
REM ============================================================

setlocal EnableDelayedExpansion
cd /d "%~dp0"

set ARG=%1
if "%ARG%"=="" set ARG=patch

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop';" ^
  "$arg = '%ARG%';" ^
  "$root = (Get-Location).Path;" ^
  "$manifestPath = Join-Path $root 'manifest.json';" ^
  "if (-not (Test-Path $manifestPath)) { Write-Host 'ERROR: manifest.json not found at ' $manifestPath -ForegroundColor Red; exit 2 };" ^
  "$manifestText = Get-Content -Raw -LiteralPath $manifestPath;" ^
  "if ($manifestText -notmatch '\"version\"\s*:\s*\"(\d+)\.(\d+)\.(\d+)\"') { Write-Host 'ERROR: could not read version from manifest.json' -ForegroundColor Red; exit 3 };" ^
  "$curMaj = [int]$Matches[1]; $curMin = [int]$Matches[2]; $curPat = [int]$Matches[3];" ^
  "$current = \"$curMaj.$curMin.$curPat\";" ^
  "if ($arg -eq 'patch') { $new = \"$curMaj.$curMin.$($curPat+1)\" }" ^
  "elseif ($arg -eq 'minor') { $new = \"$curMaj.$($curMin+1).0\" }" ^
  "elseif ($arg -eq 'major') { $new = \"$($curMaj+1).0.0\" }" ^
  "elseif ($arg -match '^(\d+)\.(\d+)\.(\d+)$') { $new = $arg }" ^
  "else { Write-Host ('ERROR: bad arg ' + $arg + '. Use patch|minor|major or a literal X.Y.Z.') -ForegroundColor Red; exit 4 };" ^
  "Write-Host '';" ^
  "Write-Host '============================================================' -ForegroundColor Cyan;" ^
  "Write-Host ('  Bumping version: v' + $current + '  ->  v' + $new) -ForegroundColor Cyan;" ^
  "Write-Host '============================================================' -ForegroundColor Cyan;" ^
  "Write-Host '';" ^
  "$targets = @(" ^
    "@{ file='manifest.json';   pattern='\"version\"\s*:\s*\"\d+\.\d+\.\d+\"';                           replace=('\"version\": \"' + $new + '\"');                        verify=('\"version\": \"' + $new + '\"') }," ^
    "@{ file='app.js';          pattern='\(v\d+\.\d+\.\d+\)';                                            replace=('(v' + $new + ')');                                      verify=('(v' + $new + ')') }," ^
    "@{ file='popup.html';      pattern='(<span[^>]*font-size:7px;color:var\(--text-dim\);[^>]*>)v\d+\.\d+\.\d+(</span>)'; replace=('${1}v' + $new + '${2}');                 verify=('v' + $new + '</span>') }," ^
    "@{ file='factory.html';    pattern='>v\d+\.\d+\.\d+ &middot; Loom Edition<';                         replace=('>v' + $new + ' &middot; Loom Edition<');                verify=('>v' + $new + ' &middot; Loom Edition<') }," ^
    "@{ file='fonts.css';       pattern='\(v\d+\.\d+\.\d+\)';                                            replace=('(v' + $new + ')');                                      verify=('(v' + $new + ')') }" ^
  ");" ^
  "$ok = $true;" ^
  "$report = @();" ^
  "foreach ($t in $targets) {" ^
    "$p = Join-Path $root $t.file;" ^
    "if (-not (Test-Path $p)) { Write-Host ('  MISSING: ' + $t.file) -ForegroundColor Red; $ok = $false; $report += [pscustomobject]@{File=$t.file; Result='MISSING'}; continue };" ^
    "$txt = Get-Content -Raw -LiteralPath $p;" ^
    "$before = $txt;" ^
    "$new_txt = [regex]::Replace($txt, $t.pattern, $t.replace, 1);" ^
    "if ($new_txt -eq $before) { Write-Host ('  NO-MATCH: ' + $t.file + '  (pattern did not find the version to replace)') -ForegroundColor Red; $ok = $false; $report += [pscustomobject]@{File=$t.file; Result='NO-MATCH'}; continue };" ^
    "[System.IO.File]::WriteAllText($p, $new_txt);" ^
    "$verify = Get-Content -Raw -LiteralPath $p;" ^
    "if ($verify -notmatch [regex]::Escape($t.verify)) { Write-Host ('  VERIFY-FAIL: ' + $t.file) -ForegroundColor Red; $ok = $false; $report += [pscustomobject]@{File=$t.file; Result='VERIFY-FAIL'}; continue };" ^
    "Write-Host ('  OK: ' + $t.file) -ForegroundColor Green;" ^
    "$report += [pscustomobject]@{File=$t.file; Result='OK'};" ^
  "};" ^
  "Write-Host '';" ^
  "if ($ok) {" ^
    "Write-Host '============================================================' -ForegroundColor Green;" ^
    "Write-Host ('  ALL 5 FILES UPDATED to v' + $new + ' (VERIFIED)') -ForegroundColor Green;" ^
    "Write-Host '============================================================' -ForegroundColor Green;" ^
    "Write-Host '';" ^
    "Write-Host 'Next steps:';" ^
    "Write-Host '  1) git add -A && git commit -m \"v' $new '\"';" ^
    "Write-Host ('  2) git tag v' + $new + ' && git push && git push --tags');" ^
    "Write-Host '  3) Or run package-extension.bat to build a local zip.';" ^
  "} else {" ^
    "Write-Host '============================================================' -ForegroundColor Red;" ^
    "Write-Host '  BUMP FAILED - one or more files were not updated.' -ForegroundColor Red;" ^
    "Write-Host '  Review the report above, fix the problem, rerun.' -ForegroundColor Red;" ^
    "Write-Host '============================================================' -ForegroundColor Red;" ^
    "exit 5;" ^
  "}"

if errorlevel 1 (
    echo.
    echo Press any key to close this window...
    pause >nul
    exit /b %errorlevel%
)

echo.
echo Press any key to close this window...
pause >nul
endlocal
