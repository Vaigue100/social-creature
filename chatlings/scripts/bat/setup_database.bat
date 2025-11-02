@echo off
REM Chatlings Database Setup Script
REM This script creates the PostgreSQL database and tables

echo ========================================
echo Chatlings Database Setup
echo ========================================
echo.

set PGPASSWORD=!1Swagger!1
set PGHOST=localhost
set PGPORT=5432
set PGUSER=postgres

echo Step 1: Creating database...
psql -U postgres -f "..\sql\01_create_database.sql"

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to create database
    pause
    exit /b 1
)

echo.
echo Step 2: Creating tables and schema...
psql -U postgres -d chatlings -f "..\sql\02_create_tables.sql"

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to create tables
    pause
    exit /b 1
)

echo.
echo ========================================
echo Database setup completed successfully!
echo ========================================
pause
