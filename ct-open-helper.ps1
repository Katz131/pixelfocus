# ct-open-helper.ps1 — Bring Cold Turkey Blocker to the foreground.
# Multiple strategies tried in order until one works.

$logFile = Join-Path (Split-Path $MyInvocation.MyCommand.Path) "cold-turkey-helper.log"
function Log($msg) { try { "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $msg" | Out-File $logFile -Append -Encoding UTF8 } catch {} }

Log "Helper started"

# --- Method 1: WScript.Shell AppActivate (COM-based, classic approach) ---
$activated = $false
try {
    $wsh = New-Object -ComObject WScript.Shell
    $activated = $wsh.AppActivate("Cold Turkey Blocker")
    Log "Method1 AppActivate('Cold Turkey Blocker') = $activated"
} catch { Log "Method1 AppActivate error: $_" }

if (-not $activated) {
    try {
        $wsh = New-Object -ComObject WScript.Shell
        $activated = $wsh.AppActivate("Cold Turkey")
        Log "Method1 AppActivate('Cold Turkey') = $activated"
    } catch { Log "Method1 AppActivate('Cold Turkey') error: $_" }
}

# --- Method 2: Just launch the exe (single-instance = brings existing window up) ---
if (-not $activated) {
    Log "Method2: launching exe directly..."
    $ctPaths = @(
        "C:\Program Files\Cold Turkey\Cold Turkey Blocker.exe",
        "C:\Program Files (x86)\Cold Turkey\Cold Turkey Blocker.exe",
        "${env:LOCALAPPDATA}\Cold Turkey\Cold Turkey Blocker.exe",
        "${env:ProgramFiles}\Cold Turkey Blocker\Cold Turkey Blocker.exe",
        "${env:LOCALAPPDATA}\Programs\Cold Turkey\Cold Turkey Blocker.exe"
    )
    foreach ($p in $ctPaths) {
        if (Test-Path $p) {
            Log "Method2: Start-Process $p"
            Start-Process $p
            $activated = $true
            break
        }
    }
}

Log "Helper finished, activated=$activated"
