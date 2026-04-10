# ============================================================
# PixelFocus extension packager
# Run this from PowerShell:
#     powershell -ExecutionPolicy Bypass -File "C:\Users\theso\Pixel todo lists\package-extension.ps1"
# Builds a clean zip of the extension INSIDE the extension folder,
# right next to this script:
#     C:\Users\theso\Pixel todo lists\pixelfocus-v3.19.3.zip
# (It lives next to the script so you can always find it in the
# same folder you're already working in, regardless of whether
# your Desktop is OneDrive-redirected.)
# ============================================================

$ErrorActionPreference = 'Stop'

$src     = 'C:\Users\theso\Pixel todo lists'
$version = '3.19.3'
$staging = Join-Path $env:TEMP ("pixelfocus-build-" + [Guid]::NewGuid().ToString('N'))
$outZip  = Join-Path $src ("pixelfocus-v$version.zip")

Write-Host ""
Write-Host "PixelFocus packager"
Write-Host "  Source:  $src"
Write-Host "  Staging: $staging"
Write-Host "  Output:  $outZip"
Write-Host ""

New-Item -ItemType Directory -Path $staging -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $staging 'icons') -Force | Out-Null

# Allowlist: only files Chrome needs to run the extension.
$files = @(
    'manifest.json',
    'background.js',
    'popup.html',
    'app.js',
    'gallery.html',
    'gallery.js',
    'factory.html',
    'factory.js',
    'stage-entries.js',
    'msglog.js',
    'sounds.js',
    'tips.js',
    'tooltip.js',
    'fonts.css'
)

foreach ($f in $files) {
    $full = Join-Path $src $f
    if (Test-Path $full) {
        Copy-Item $full (Join-Path $staging $f)
        Write-Host "  + $f"
    } else {
        Write-Warning "  - $f (missing, skipped)"
    }
}

# Icons directory (PNG assets only).
Get-ChildItem -Path (Join-Path $src 'icons') -Filter '*.png' | ForEach-Object {
    Copy-Item $_.FullName (Join-Path $staging 'icons' $_.Name)
    Write-Host "  + icons/$($_.Name)"
}

# Fresh zip. Overwrite any previous build.
if (Test-Path $outZip) { Remove-Item $outZip -Force }
Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $outZip -CompressionLevel Optimal

# Clean up staging.
Remove-Item $staging -Recurse -Force

if (-not (Test-Path $outZip)) {
    Write-Error "Zip was not created. Check the errors above."
    exit 1
}

$sizeKb = [math]::Round((Get-Item $outZip).Length / 1KB, 1)
Write-Host ""
Write-Host "================================================"
Write-Host "  Packaged: $outZip"
Write-Host "  Size:     $sizeKb KB"
Write-Host "================================================"
Write-Host ""
Write-Host "The zip is in the same folder as this script."
Write-Host "Open File Explorer to 'C:\Users\theso\Pixel todo lists'"
Write-Host "and you will see 'pixelfocus-v$version.zip' there."
Write-Host ""
Write-Host "Your friend can install it with:"
Write-Host "  1. Unzip the archive anywhere."
Write-Host "  2. Open brave://extensions or chrome://extensions."
Write-Host "  3. Enable 'Developer mode' (top-right toggle)."
Write-Host "  4. Click 'Load unpacked' and pick the unzipped folder."
Write-Host ""
Write-Host "Press Enter to close this window..."
[void][System.Console]::ReadLine()
