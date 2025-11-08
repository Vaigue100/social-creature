@echo off
echo ================================================================================
echo Stopping Chatlings Services
echo ================================================================================
echo.

echo Stopping Chatlings Server...
REM Kill by window title
for /f "tokens=2" %%i in ('tasklist /fi "windowtitle eq Chatlings Server" /fo csv /nh 2^>nul ^| find "node.exe"') do (
    taskkill /pid %%i /f >nul 2>&1
)

echo Stopping Perchance ZIP Watcher...
REM Kill by window title
for /f "tokens=2" %%i in ('tasklist /fi "windowtitle eq Perchance ZIP Watcher" /fo csv /nh 2^>nul ^| find "node.exe"') do (
    taskkill /pid %%i /f >nul 2>&1
)

REM Alternative: Kill by command line
wmic process where "commandline like '%%admin-server.js%%'" delete >nul 2>&1
wmic process where "commandline like '%%perchance-watcher.js%%'" delete >nul 2>&1

echo.
echo ================================================================================
echo All services stopped!
echo ================================================================================
echo.

pause
