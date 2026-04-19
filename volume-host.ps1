# =============================================================================
# volume-host.ps1 — Native Messaging Host for Todo of the Loom
#
# Receives JSON commands from the Chrome extension via stdin (native messaging
# protocol) and controls system volume or writes config files.
#
# Supported actions:
#   testMute    — mute for 5 seconds, then unmute
#   mute        — mute system volume
#   unmute      — unmute system volume
#   writeConfig — write volume-config.json to %LOCALAPPDATA%\TodoOfTheLoom\
# =============================================================================

# ---- Audio control via Windows Core Audio COM (correct vtable layout) ----
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class AudioManager {
    // Use the raw COM approach with Marshal.GetObjectForIUnknown
    [DllImport("ole32.dll")]
    static extern int CoCreateInstance(
        ref Guid clsid, IntPtr pUnkOuter, uint dwClsContext,
        ref Guid iid, out IntPtr ppv);

    private const int DEVICE_STATE_ACTIVE = 0x00000001;
    private const int eRender = 0;
    private const int eMultimedia = 1;

    // IMMDeviceEnumerator vtable offsets (after IUnknown: QI=0, AddRef=1, Release=2)
    // 3 = EnumAudioEndpoints, 4 = GetDefaultAudioEndpoint
    // IMMDevice vtable: 3 = Activate, 4 = OpenPropertyStore, 5 = GetId, 6 = GetState
    // IAudioEndpointVolume vtable: 3..14 = various, 15 = GetMute, 16 = SetMute

    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

    // Simplest reliable approach: simulate media key press
    public static void Mute() {
        // VK_VOLUME_MUTE = 0xAD, KEYEVENTF_KEYDOWN=0, KEYEVENTF_KEYUP=2
        keybd_event(0xAD, 0, 0, UIntPtr.Zero);
        keybd_event(0xAD, 0, 2, UIntPtr.Zero);
    }

    public static void SetVolume(int level) {
        // level 0-100: press volume down enough times to reach 0, then up to reach target
        // Each press = 2% change. 50 presses = guaranteed 0.
        if (level <= 0) {
            for (int i = 0; i < 50; i++) {
                keybd_event(0xAE, 0, 0, UIntPtr.Zero); // VK_VOLUME_DOWN
                keybd_event(0xAE, 0, 2, UIntPtr.Zero);
            }
        }
    }

    public static void RestoreVolume(int level) {
        // Press up from 0 to desired level (each press = 2%)
        int presses = level / 2;
        for (int i = 0; i < presses; i++) {
            keybd_event(0xAF, 0, 0, UIntPtr.Zero); // VK_VOLUME_UP
            keybd_event(0xAF, 0, 2, UIntPtr.Zero);
        }
    }
}
"@ -ErrorAction SilentlyContinue

# ---- Native messaging protocol helpers ----
function Read-NativeMessage {
    $stdin = [Console]::OpenStandardInput()
    $lengthBytes = New-Object byte[] 4
    $bytesRead = $stdin.Read($lengthBytes, 0, 4)
    if ($bytesRead -lt 4) { return $null }
    $length = [BitConverter]::ToUInt32($lengthBytes, 0)
    if ($length -eq 0 -or $length -gt 1048576) { return $null }
    $messageBytes = New-Object byte[] $length
    $totalRead = 0
    while ($totalRead -lt $length) {
        $read = $stdin.Read($messageBytes, $totalRead, $length - $totalRead)
        if ($read -eq 0) { break }
        $totalRead += $read
    }
    $message = [System.Text.Encoding]::UTF8.GetString($messageBytes, 0, $totalRead)
    return ($message | ConvertFrom-Json)
}

function Write-NativeMessage($response) {
    $json = $response | ConvertTo-Json -Compress -Depth 10
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    $stdout = [Console]::OpenStandardOutput()
    $stdout.Write([BitConverter]::GetBytes([uint32]$bytes.Length), 0, 4)
    $stdout.Write($bytes, 0, $bytes.Length)
    $stdout.Flush()
}

# ---- Main ----
try {
    $msg = Read-NativeMessage
    if ($null -eq $msg) {
        Write-NativeMessage @{ ok = $false; error = "no message received" }
        exit 0
    }

    $action = $msg.action
    $response = @{ ok = $true; action = $action }

    switch ($action) {
        "mute" {
            # Set volume to 0
            [AudioManager]::SetVolume(0)
            $response.muted = $true
        }
        "unmute" {
            # Restore to ~50%
            [AudioManager]::SetVolume(0)
            [AudioManager]::RestoreVolume(50)
            $response.muted = $false
        }
        "testMute" {
            # Mute for 5 seconds then restore
            [AudioManager]::SetVolume(0)
            Start-Sleep -Seconds 5
            [AudioManager]::RestoreVolume(50)
            $response.message = "Volume zeroed for 5 seconds then restored to 50%"
        }
        "getMute" {
            $response.muted = $false
        }
        "writeConfig" {
            $configDir = "$env:LOCALAPPDATA\TodoOfTheLoom"
            if (-not (Test-Path $configDir)) {
                New-Item -ItemType Directory -Path $configDir -Force | Out-Null
            }
            $configPath = "$configDir\volume-config.json"
            $msg.config | ConvertTo-Json -Depth 5 | Set-Content -Path $configPath -Encoding UTF8
            $response.path = $configPath
            $response.message = "Config written"
        }
        default {
            $response.ok = $false
            $response.error = "unknown action: $action"
        }
    }

    Write-NativeMessage $response
} catch {
    try {
        Write-NativeMessage @{ ok = $false; error = $_.Exception.Message }
    } catch {
        # Nothing we can do
    }
}
