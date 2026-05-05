# deploy-hosting.ps1 — Deploy Firebase Hosting via REST API (no CLI needed)
# Uses service account key for authentication

$ErrorActionPreference = "Stop"
$ProjectId = "todo-of-the-loom"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$KeyFile = Join-Path $ScriptDir "todo-of-the-loom-firebase-adminsdk-fbsvc-b2d375f258.json"
$HostingDir = Join-Path $ScriptDir "firebase-hosting"

# ── 1. Read service account key ──
Write-Host "[1/6] Reading service account key..." -ForegroundColor Cyan
if (-not (Test-Path $KeyFile)) {
    Write-Host "ERROR: Service account key not found at $KeyFile" -ForegroundColor Red
    exit 1
}
$sa = Get-Content $KeyFile -Raw | ConvertFrom-Json

# ── 2. Create JWT and exchange for access token ──
Write-Host "[2/6] Authenticating with Google..." -ForegroundColor Cyan

# Base64url encode helper
function ConvertTo-Base64Url($bytes) {
    [Convert]::ToBase64String($bytes).Replace('+','-').Replace('/','_').TrimEnd('=')
}

# JWT Header
$header = '{"alg":"RS256","typ":"JWT"}'
$headerB64 = ConvertTo-Base64Url([System.Text.Encoding]::UTF8.GetBytes($header))

# JWT Claims
$now = [int][Math]::Floor(([DateTimeOffset]::UtcNow).ToUnixTimeSeconds())
$claims = @{
    iss   = $sa.client_email
    scope = "https://www.googleapis.com/auth/cloud-platform"
    aud   = $sa.token_uri
    iat   = $now
    exp   = $now + 3600
} | ConvertTo-Json -Compress
$claimsB64 = ConvertTo-Base64Url([System.Text.Encoding]::UTF8.GetBytes($claims))

# Sign with RSA private key (compatible with Windows PowerShell 5.1)
$signingInput = "$headerB64.$claimsB64"
$keyText = $sa.private_key -replace "-----BEGIN PRIVATE KEY-----", "" -replace "-----END PRIVATE KEY-----", "" -replace "\n", ""
$keyBytes = [Convert]::FromBase64String($keyText)
$cngKey = [System.Security.Cryptography.CngKey]::Import($keyBytes, [System.Security.Cryptography.CngKeyBlobFormat]::Pkcs8PrivateBlob)
$rsa = New-Object System.Security.Cryptography.RSACng($cngKey)
$sigBytes = $rsa.SignData(
    [System.Text.Encoding]::UTF8.GetBytes($signingInput),
    [System.Security.Cryptography.HashAlgorithmName]::SHA256,
    [System.Security.Cryptography.RSASignaturePadding]::Pkcs1
)
$signature = ConvertTo-Base64Url $sigBytes
$jwt = "$signingInput.$signature"

# Exchange JWT for access token
$bodyStr = "grant_type=" + [Uri]::EscapeDataString("urn:ietf:params:oauth:grant-type:jwt-bearer") + "&assertion=" + [Uri]::EscapeDataString($jwt)
try {
    $tokenResponse = Invoke-RestMethod -Uri $sa.token_uri -Method POST -Body $bodyStr -ContentType "application/x-www-form-urlencoded"
} catch {
    Write-Host "ERROR authenticating: $($_.Exception.Message)" -ForegroundColor Red
    try {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host $reader.ReadToEnd() -ForegroundColor Red
    } catch {}
    exit 1
}
$token = $tokenResponse.access_token
Write-Host "  Authenticated as $($sa.client_email)" -ForegroundColor Green

# ── 3. Collect files and compute SHA256 hashes ──
Write-Host "[3/6] Scanning files to deploy..." -ForegroundColor Cyan
$files = Get-ChildItem -Path $HostingDir -Recurse -File
$fileMap = @{}  # /path -> hash
$hashToFile = @{}  # hash -> local path

$hashToGzBytes = @{}  # hash -> gzipped bytes

foreach ($f in $files) {
    $relativePath = "/" + $f.FullName.Substring($HostingDir.Length + 1).Replace("\", "/")

    # Gzip the file first, then hash the gzipped content
    $rawBytes = [System.IO.File]::ReadAllBytes($f.FullName)
    $ms = New-Object System.IO.MemoryStream
    $gz = New-Object System.IO.Compression.GZipStream($ms, [System.IO.Compression.CompressionMode]::Compress)
    $gz.Write($rawBytes, 0, $rawBytes.Length)
    $gz.Close()
    $gzBytes = $ms.ToArray()
    $ms.Close()

    # Hash the gzipped content
    $shaObj = [System.Security.Cryptography.SHA256]::Create()
    $hashBytes = $shaObj.ComputeHash($gzBytes)
    $hash = [BitConverter]::ToString($hashBytes).Replace("-","").ToLower()

    $fileMap[$relativePath] = $hash
    $hashToFile[$hash] = $f.FullName
    $hashToGzBytes[$hash] = $gzBytes
    Write-Host "  $relativePath ($hash)" -ForegroundColor Gray
}
Write-Host "  Found $($files.Count) file(s)" -ForegroundColor Green

# ── 4. Create a new hosting version ──
Write-Host "[4/6] Creating new hosting version..." -ForegroundColor Cyan
$headers = @{ Authorization = "Bearer $token" }
$siteId = $ProjectId

$versionResp = Invoke-RestMethod `
    -Uri "https://firebasehosting.googleapis.com/v1beta1/sites/$siteId/versions" `
    -Method POST `
    -Headers $headers `
    -Body '{}' `
    -ContentType "application/json"
$versionName = $versionResp.name
Write-Host "  Created version: $versionName" -ForegroundColor Green

# ── 5. Populate files (tell Firebase what files this version has) ──
Write-Host "[5/6] Uploading files..." -ForegroundColor Cyan
$populateBody = @{
    files = $fileMap
} | ConvertTo-Json -Depth 5

$populateResp = Invoke-RestMethod `
    -Uri "https://firebasehosting.googleapis.com/v1beta1/$versionName`:populateFiles" `
    -Method POST `
    -Headers $headers `
    -Body $populateBody `
    -ContentType "application/json"

$uploadUrl = $populateResp.uploadUrl
$uploadRequired = $populateResp.uploadRequiredHashes

if ($uploadRequired -and $uploadRequired.Count -gt 0) {
    Write-Host "  Uploading $($uploadRequired.Count) file(s)..." -ForegroundColor Yellow
    foreach ($hash in $uploadRequired) {
        $localPath = $hashToFile[$hash]
        $gzBytes = $hashToGzBytes[$hash]

        Invoke-RestMethod `
            -Uri "$uploadUrl/$hash" `
            -Method POST `
            -Headers $headers `
            -Body $gzBytes `
            -ContentType "application/octet-stream" | Out-Null

        $fileName = Split-Path $localPath -Leaf
        Write-Host "  Uploaded: $fileName" -ForegroundColor Green
    }
} else {
    Write-Host "  All files already cached (no upload needed)" -ForegroundColor Green
}

# ── 6. Finalize the version and release it ──
Write-Host "[6/6] Finalizing and releasing..." -ForegroundColor Cyan

# Finalize version
Invoke-RestMethod `
    -Uri "https://firebasehosting.googleapis.com/v1beta1/${versionName}?update_mask=status" `
    -Method PATCH `
    -Headers $headers `
    -Body '{"status":"FINALIZED"}' `
    -ContentType "application/json" | Out-Null

# Release it
Invoke-RestMethod `
    -Uri "https://firebasehosting.googleapis.com/v1beta1/sites/$siteId/releases?versionName=$versionName" `
    -Method POST `
    -Headers $headers `
    -Body '{}' `
    -ContentType "application/json" | Out-Null

Write-Host ""
Write-Host "SUCCESS! Website deployed to https://$siteId.web.app" -ForegroundColor Green
Write-Host ""
