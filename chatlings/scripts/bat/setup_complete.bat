@echo off
REM Complete Chatlings Database Setup
REM This script runs all setup steps in sequence

echo ========================================
echo Chatlings Complete Database Setup
echo ========================================
echo.

set PGPASSWORD=!1Swagger!1
set PGHOST=localhost
set PGPORT=5432
set PGUSER=postgres

echo Step 1: Creating database...
psql -U postgres -f "..\sql\01_create_database.sql"
if %ERRORLEVEL% NEQ 0 goto error

echo.
echo Step 2: Creating tables and schema...
psql -U postgres -d chatlings -f "..\sql\02_create_tables.sql"
if %ERRORLEVEL% NEQ 0 goto error

echo.
echo Step 3: Importing all data...
psql -U postgres -d chatlings -f "..\sql\03_import_data.sql"
if %ERRORLEVEL% NEQ 0 goto error

echo.
echo ========================================
echo Complete setup finished successfully!
echo ========================================
echo.
echo Database: chatlings
echo Host: localhost:5432
echo User: postgres
echo.
echo Total creatures and lore data imported.
echo.
pause
exit /b 0

:error
echo.
echo ========================================
echo ERROR: Setup failed!
echo ========================================
echo Check the error messages above
pause
exit /b 1
