@echo off
REM Chatlings Database Backup Script

echo ========================================
echo Chatlings Database Backup
echo ========================================
echo.

set PGPASSWORD=!1Swagger!1
set BACKUP_DIR=..\..\data\backups
set TIMESTAMP=%date:~-4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo Creating backup: chatlings_%TIMESTAMP%.sql
pg_dump -U postgres -h localhost chatlings > "%BACKUP_DIR%\chatlings_%TIMESTAMP%.sql"

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Backup failed
    pause
    exit /b 1
)

echo.
echo Backup completed successfully!
echo Location: %BACKUP_DIR%\chatlings_%TIMESTAMP%.sql
pause
