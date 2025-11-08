@echo off
echo ================================================================================
echo Chatlings Services Status
echo ================================================================================
echo.

echo Checking for running services...
echo.

set FOUND=0

REM Check for Chatlings Server
tasklist /fi "windowtitle eq Chatlings Server" /fo csv /nh 2>nul | find "node.exe" >nul
if %errorlevel%==0 (
    echo [RUNNING] Chatlings Server
    echo           http://localhost:3000
    echo           http://localhost:3000/user/login.html
    set FOUND=1
) else (
    echo [STOPPED] Chatlings Server
)

echo.

REM Check for Perchance ZIP Watcher
tasklist /fi "windowtitle eq Perchance ZIP Watcher" /fo csv /nh 2>nul | find "node.exe" >nul
if %errorlevel%==0 (
    echo [RUNNING] Perchance ZIP Watcher
    set FOUND=1
) else (
    echo [STOPPED] Perchance ZIP Watcher
)

echo.

REM Alternative check by process command line
echo Checking for any node processes running scripts...
wmic process where "commandline like '%%admin-server.js%%'" get commandline 2>nul | find "admin-server.js" >nul
if %errorlevel%==0 (
    echo [FOUND] admin-server.js process
    set FOUND=1
)

wmic process where "commandline like '%%perchance-watcher.js%%'" get commandline 2>nul | find "perchance-watcher.js" >nul
if %errorlevel%==0 (
    echo [FOUND] perchance-watcher.js process
    set FOUND=1
)

echo.
echo ================================================================================

if %FOUND%==1 (
    echo Status: Services are running
    echo.
    echo To stop: run stop-all-services.bat
    echo To restart: run start-all-services.bat
) else (
    echo Status: No services running
    echo.
    echo To start: run start-all-services.bat
)

echo ================================================================================
echo.

pause
