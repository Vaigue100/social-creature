@echo off
REM Check if PostgreSQL is installed and find its location

echo ========================================
echo PostgreSQL Installation Check
echo ========================================
echo.

REM Check common PostgreSQL installation paths
set PSQL_FOUND=0

REM Check Program Files
if exist "C:\Program Files\PostgreSQL" (
    echo Found PostgreSQL in: C:\Program Files\PostgreSQL
    dir "C:\Program Files\PostgreSQL" /b
    set PSQL_FOUND=1
)

REM Check Program Files (x86)
if exist "C:\Program Files (x86)\PostgreSQL" (
    echo Found PostgreSQL in: C:\Program Files (x86)\PostgreSQL
    dir "C:\Program Files (x86)\PostgreSQL" /b
    set PSQL_FOUND=1
)

echo.
REM Try to find psql.exe
echo Searching for psql.exe...
where psql.exe 2>nul
if %ERRORLEVEL% EQU 0 (
    echo psql.exe is in your PATH - Ready to use!
    set PSQL_FOUND=1
) else (
    echo psql.exe NOT found in PATH
)

echo.
echo ========================================
if %PSQL_FOUND% EQU 0 (
    echo PostgreSQL is NOT installed or not found
    echo.
    echo Download and install PostgreSQL from:
    echo https://www.postgresql.org/download/windows/
    echo.
    echo Recommended: PostgreSQL 14 or higher
    echo During installation, remember your admin password!
) else (
    echo PostgreSQL appears to be installed
    echo.
    echo If psql is not in PATH, you need to add it:
    echo 1. Find your PostgreSQL bin directory
    echo    Example: C:\Program Files\PostgreSQL\14\bin
    echo 2. Add it to your Windows PATH environment variable
    echo.
    echo OR run the setup script from the PostgreSQL bin directory
)
echo ========================================
echo.
pause
