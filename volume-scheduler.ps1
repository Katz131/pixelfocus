# =============================================================================
# volume-scheduler.ps1 — Todo of the Loom Volume Mute Scheduler
#
# Runs as a Windows Task Scheduler job every 5 minutes.
# Reads config from %LOCALAPPDATA%\TodoOfTheLoom\volume-config.json
# Mutes system volume during configured hours, unmutes outside them.
# =============================================================================

$configPath = "$env:LOCALAPPDATA\TodoOfTheLoom\volume-config.json"

# Default config
$muteHour   = 23
$muteMinute = 0
$unmuteHour = 10
$unmuteMinute = 0
$enabled    = $true

# Read config if it exists
if (Test-Path $configPath) {
    try {
        $cfg = Get-Content $configPath -Raw | ConvertFrom-Json
        if ($null -ne $cfg.muteHour)     { $muteHour     = [int]$cfg.muteHour }
        if ($null -ne $cfg.muteMinute)   { $muteMinute   = [int]$cfg.muteMinute }
        if ($null -ne $cfg.unmuteHour)   { $unmuteHour   = [int]$cfg.unmuteHour }
        if ($null -ne $cfg.unmuteMinute) { $unmuteMinute = [int]$cfg.unmuteMinute }
        if ($null -ne $cfg.enabled)      { $enabled       = [bool]$cfg.enabled }
    } catch {
        # Bad config — use defaults
    }
}

if (-not $enabled) { exit 0 }

# Current time in minutes since midnight
$now = Get-Date
$nowMin = $now.Hour * 60 + $now.Minute

$muteAt   = $muteHour * 60 + $muteMinute
$unmuteAt = $unmuteHour * 60 + $unmuteMinute

# Determine if we should be muted right now
# Handles overnight ranges (e.g. 23:00 → 10:00) and same-day ranges
$shouldMute = $false
if ($muteAt -lt $unmuteAt) {
    # Same-day range (e.g. 01:00 → 06:00)
    $shouldMute = ($nowMin -ge $muteAt) -and ($nowMin -lt $unmuteAt)
} else {
    # Overnight range (e.g. 23:00 → 10:00)
    $shouldMute = ($nowMin -ge $muteAt) -or ($nowMin -lt $unmuteAt)
}

# Use keyboard simulation to control volume (works on all Windows versions)
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class VolumeControl {
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

    public static void SetVolume(int level) {
        // Drop to 0 first (50 presses of volume down)
        for (int i = 0; i < 50; i++) {
            keybd_event(0xAE, 0, 0, UIntPtr.Zero);
            keybd_event(0xAE, 0, 2, UIntPtr.Zero);
        }
        // Now raise to target (each press = 2%)
        int presses = level / 2;
        for (int i = 0; i < presses; i++) {
            keybd_event(0xAF, 0, 0, UIntPtr.Zero);
            keybd_event(0xAF, 0, 2, UIntPtr.Zero);
        }
    }
}
"@ -ErrorAction SilentlyContinue

try {
    if ($shouldMute) {
        [VolumeControl]::SetVolume(0)
    } else {
        [VolumeControl]::SetVolume(50)
    }
} catch {
    # Silently fail — will retry in 5 minutes
}
