@echo off
echo %date% %time% VOLUME-HOST-BAT >> "%~dp0bat-flash-log.txt"
powershell -NoProfile -NoLogo -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0volume-host.ps1"
