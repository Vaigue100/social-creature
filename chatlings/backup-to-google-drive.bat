@echo off
REM Full Backup Batch Script
REM Creates database backup and copies to Google Drive

echo.
echo ================================================================================
echo Chatlings Full Backup (Database + Google Drive)
echo ================================================================================
echo.

cd /d "%~dp0"
node scripts\full-backup.js

echo.
pause
