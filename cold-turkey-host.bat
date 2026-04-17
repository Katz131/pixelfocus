@echo off
REM Native messaging host for Todo of the Loom — Cold Turkey bridge.
REM This script is called by Chrome/Brave when the extension sends a native message.
REM It reads the message, then starts or stops a Cold Turkey block.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0cold-turkey-host.ps1"
