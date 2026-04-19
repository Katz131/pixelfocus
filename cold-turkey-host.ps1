# cold-turkey-host.ps1
# Native messaging host for Todo of the Loom.
# Reads a Chrome native message from stdin, then launches Cold Turkey Blocker
# with the requested action.

$logFile = Join-Path (Split-Path $MyInvocation.MyCommand.Path) "cold-turkey-host.log"
try { "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') Host started" | Out-File $logFile -Append } catch {}

# --- Read the 4-byte length prefix ---
$stdin = [System.Console]::OpenStandardInput()
$lengthBytes = New-Object byte[] 4
$bytesRead = $stdin.Read($lengthBytes, 0, 4)
if ($bytesRead -lt 4) { exit 1 }
$length = [System.BitConverter]::ToInt32($lengthBytes, 0)
if ($length -le 0 -or $length -gt 100000) { exit 1 }

# --- Read the JSON message ---
$messageBytes = New-Object byte[] $length
$totalRead = 0
while ($totalRead -lt $length) {
    $chunk = $stdin.Read($messageBytes, $totalRead, $length - $totalRead)
    if ($chunk -le 0) { exit 1 }
    $totalRead += $chunk
}
$json = [System.Text.Encoding]::UTF8.GetString($messageBytes)
$msg = $json | ConvertFrom-Json

try { "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') action=$($msg.action) block=$($msg.block)" | Out-File $logFile -Append } catch {}

# --- Find Cold Turkey Blocker executable ---
$ctPaths = @(
    "C:\Program Files\Cold Turkey\Cold Turkey Blocker.exe",
    "C:\Program Files (x86)\Cold Turkey\Cold Turkey Blocker.exe",
    "${env:LOCALAPPDATA}\Cold Turkey\Cold Turkey Blocker.exe",
    "${env:ProgramFiles}\Cold Turkey Blocker\Cold Turkey Blocker.exe",
    "${env:LOCALAPPDATA}\Programs\Cold Turkey\Cold Turkey Blocker.exe",
    "${env:LOCALAPPDATA}\Cold Turkey Blocker\Cold Turkey Blocker.exe"
)
$ctExe = $null
foreach ($p in $ctPaths) {
    if (Test-Path $p) { $ctExe = $p; break }
}
if (-not $ctExe) {
    try {
        $found = (Get-Command "Cold Turkey Blocker.exe" -ErrorAction SilentlyContinue).Source
        if ($found) { $ctExe = $found }
    } catch {}
}

try { "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ctExe=$ctExe" | Out-File $logFile -Append } catch {}

# --- Send response back to Chrome ---
function Send-Response($obj) {
    $respJson = $obj | ConvertTo-Json -Compress
    $respBytes = [System.Text.Encoding]::UTF8.GetBytes($respJson)
    $stdout = [System.Console]::OpenStandardOutput()
    $lenBytes = [System.BitConverter]::GetBytes([int]$respBytes.Length)
    $stdout.Write($lenBytes, 0, 4)
    $stdout.Write($respBytes, 0, $respBytes.Length)
    $stdout.Flush()
}

if (-not $ctExe) {
    Send-Response @{ success = $false; error = "Cold Turkey Blocker not found" }
    exit 0
}

$action = $msg.action
$blockName = $msg.block

if ($action -eq "start") {
    $minutes = $msg.minutes
    if ($minutes -and $minutes -gt 0) {
        Start-Process $ctExe -ArgumentList "-start `"$blockName`" -lock `"$minutes minutes`""
    } else {
        Start-Process $ctExe -ArgumentList "-start `"$blockName`""
    }
    Send-Response @{ success = $true; action = "start"; block = $blockName }
}
elseif ($action -eq "stop") {
    Start-Process $ctExe -ArgumentList "-stop `"$blockName`""
    Send-Response @{ success = $true; action = "stop"; block = $blockName }
}
elseif ($action -eq "open") {
    try { "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') open: v24 kill-and-relaunch" | Out-File $logFile -Append } catch {}

    # Close the CT GUI window (blocks stay active — the service is separate)
    try {
        $ctProcs = [System.Diagnostics.Process]::GetProcessesByName("Cold Turkey Blocker")
        foreach ($cp in $ctProcs) {
            try { "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') open: closing PID=$($cp.Id)" | Out-File $logFile -Append } catch {}
            $cp.CloseMainWindow() | Out-Null
        }
        Start-Sleep -Milliseconds 500
        # Force kill if still running
        $ctProcs = [System.Diagnostics.Process]::GetProcessesByName("Cold Turkey Blocker")
        foreach ($cp in $ctProcs) {
            try { $cp.Kill() } catch {}
        }
        Start-Sleep -Milliseconds 300
    } catch {}

    # Now launch fresh — new process always gets foreground
    try { "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') open: launching fresh" | Out-File $logFile -Append } catch {}
    Start-Process $ctExe
    try { "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') open: done" | Out-File $logFile -Append } catch {}

    Send-Response @{ success = $true; action = "open" }
}
else {
    Send-Response @{ success = $false; error = "Unknown action: $action" }
}

exit 0
