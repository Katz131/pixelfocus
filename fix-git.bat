@echo off
echo ============================================
echo   Safe fix: squash unpushed commits into
echo   one clean commit without secrets or
echo   large files.
echo ============================================
echo.

cd /d "%~dp0"

echo Step 1: Soft-reset to last pushed commit (keeps all file changes)...
git reset --soft origin/main

echo Step 2: Unstage problem files...
git reset HEAD firebase-tools-instant-win.exe 2>nul
git reset HEAD todo-of-the-loom-firebase-adminsdk-fbsvc-b2d375f258.json 2>nul

echo Step 3: Add them to .gitignore...
echo firebase-tools-instant-win.exe>> .gitignore
echo todo-of-the-loom-firebase-adminsdk*.json>> .gitignore

echo Step 4: Stage everything else...
git add -A
git reset HEAD firebase-tools-instant-win.exe 2>nul
git reset HEAD todo-of-the-loom-firebase-adminsdk-fbsvc-b2d375f258.json 2>nul

echo Step 5: Commit...
git commit -m "Release v3.23.66"

echo Step 6: Push to GitHub...
git push origin main

echo.
echo ============================================
echo   Done! Check for errors above.
echo ============================================
pause
