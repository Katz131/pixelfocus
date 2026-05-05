@echo off
echo ============================================
echo   Fix: delete old tags that reference the
echo   large file, then recreate on clean commit.
echo ============================================
echo.

cd /d "%~dp0"

echo Deleting old local tags...
git tag -d v3.23.54 2>nul
git tag -d v3.23.64 2>nul
git tag -d v3.23.66 2>nul

echo Deleting old remote tags...
git push origin :refs/tags/v3.23.54 2>nul
git push origin :refs/tags/v3.23.64 2>nul
git push origin :refs/tags/v3.23.66 2>nul

echo Creating clean tag on current commit...
git tag v3.23.66

echo Pushing tag...
git push origin v3.23.66

echo.
echo ============================================
echo   Done! Check for errors above.
echo ============================================
pause
