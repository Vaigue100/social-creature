@echo off
REM Chatlings Database Setup Using Node.js
REM This script doesn't require psql to be in PATH

echo ========================================
echo Chatlings Database Setup (Node.js)
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed
    echo Please install from: https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js version:
node --version
echo.

REM Install required Node.js package (pg)
echo Installing required package (pg)...
cd ..\..
if not exist "node_modules\pg" (
    npm install pg
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to install pg package
        pause
        exit /b 1
    )
)

echo.
echo Running database setup script...
echo.

cd scripts
node setup-database.js

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ========================================
    echo ERROR: Setup failed!
    echo ========================================
    pause
    exit /b 1
)

echo.
echo ========================================
echo Setup completed successfully!
echo ========================================
pause
