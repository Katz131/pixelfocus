@echo off
cd /d "%~dp0"
echo Restoring original tab icons...
git checkout 7a5bcb5 -- icons/icon16.png icons/icon48.png
echo Done! Old colorful grid icons restored for browser tabs.
pause
