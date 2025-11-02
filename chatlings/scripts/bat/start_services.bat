@echo off
REM Chatlings Service Starter
REM Starts PostgreSQL and other required services

echo ========================================
echo Chatlings Service Starter
echo ========================================
echo.

echo Starting PostgreSQL service...
net start postgresql-x64-14
if %ERRORLEVEL% EQU 0 (
    echo PostgreSQL started successfully
) else (
    echo PostgreSQL may already be running or service name is different
    echo Check your PostgreSQL service name in Windows Services
)

echo.
echo Services started!
echo.
pause
