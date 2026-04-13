Add-Type -AssemblyName System.Drawing

$outDir = "C:\Users\theso\Pixel todo lists\icons"

# Icon: 128x128
$iconImages = @(
    @{ Src = "C:\Users\theso\OneDrive\Desktop\google icon todo of the loom 2026-04-13_11-11-50.jpg"; Out = "icon128.png"; W = 128; H = 128 }
)

# Screenshots: 1280x800, JPEG, no alpha
$ssImages = @(
    @{ Src = "C:\Users\theso\OneDrive\Desktop\example loom gameplay 2026-04-13_11-36-25.jpg";    Out = "screenshot-gameplay.jpg" },
    @{ Src = "C:\Users\theso\OneDrive\Desktop\1 example google 2026-04-13_11-48-07.jpg";         Out = "screenshot-operations.jpg" },
    @{ Src = "C:\Users\theso\OneDrive\Desktop\2 example google 2026-04-13_11-48-07.jpg";         Out = "screenshot-console.jpg" },
    @{ Src = "C:\Users\theso\OneDrive\Desktop\3 example google 2026-04-13_11-48-07.jpg";         Out = "screenshot-canvas.jpg" },
    @{ Src = "C:\Users\theso\OneDrive\Desktop\4 example google 2026-04-13_11-48-07.jpg";         Out = "screenshot-house.jpg" }
)

# Resize icon to 128x128
foreach ($img in $iconImages) {
    $src = [System.Drawing.Image]::FromFile($img.Src)
    $bmp = New-Object System.Drawing.Bitmap($img.W, $img.H)
    $g   = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode   = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($src, 0, 0, $img.W, $img.H)
    $g.Dispose()
    $outFile = Join-Path $outDir $img.Out
    $bmp.Save($outFile, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    $src.Dispose()
    Write-Host "Saved $outFile (128x128 PNG)"
}

# Resize screenshots to 1280x800, fit with dark background, save as JPEG
$tw = 1280; $th = 800
$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 95L)

foreach ($img in $ssImages) {
    $src = [System.Drawing.Image]::FromFile($img.Src)
    $bmp = New-Object System.Drawing.Bitmap($tw, $th)
    $g   = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode   = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # Dark background
    $g.Clear([System.Drawing.Color]::FromArgb(26, 26, 46))

    # Scale to fit
    $scale = [Math]::Min($tw / $src.Width, $th / $src.Height)
    $dw = [int]($src.Width * $scale)
    $dh = [int]($src.Height * $scale)
    $dx = [int](($tw - $dw) / 2)
    $dy = [int](($th - $dh) / 2)
    $g.DrawImage($src, $dx, $dy, $dw, $dh)
    $g.Dispose()

    $outFile = Join-Path $outDir $img.Out
    $bmp.Save($outFile, $jpegCodec, $encParams)
    $bmp.Dispose()
    $src.Dispose()
    Write-Host "Saved $outFile (1280x800 JPEG)"
}

Write-Host "`nDone! 1 icon (128x128) + 5 screenshots (1280x800) saved to $outDir"
