@echo off
echo %date% %time% CT-HOST-BAT >> "%~dp0bat-flash-log.txt"
powershell -NoProfile -NoLogo -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0cold-turkey-host.ps1"
