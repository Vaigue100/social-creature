@echo off
REM Copy to Google Drive Batch Script
REM Copies existing database backups and artwork to Google Drive

echo.
echo ================================================================================
echo Copy Backups to Google Drive
echo ================================================================================
echo.

cd /d "%~dp0"
node scripts\copy-to-google-drive.js

echo.
pause
