@echo off
REM Chatlings Art Generation Service

echo ========================================
echo Chatlings Art Generation
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Python is not installed
    echo Please install Python from: https://www.python.org/
    pause
    exit /b 1
)

echo Python version:
python --version
echo.

REM Check if pip packages are installed
echo Checking dependencies...
pip show psycopg2-binary >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Installing psycopg2-binary...
    pip install psycopg2-binary
)

pip show perchance >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Installing perchance...
    pip install perchance
    echo Installing playwright browsers...
    python -m playwright install chromium
)

echo.
echo Starting art generation...
echo.

cd ..
python generate_creature_art.py

echo.
echo ========================================
pause
