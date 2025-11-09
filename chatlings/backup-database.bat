@echo off
REM Database Backup Batch Script
REM Creates a timestamped SQL backup of the chatlings database

echo.
echo ================================================================================
echo Chatlings Database Backup
echo ================================================================================
echo.

cd /d "%~dp0"
node scripts\backup-database.js

echo.
pause
