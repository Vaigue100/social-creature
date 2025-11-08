@echo off
echo ================================================================================
echo Starting Chatlings Services
echo ================================================================================
echo.

echo Checking for existing services...
echo.

REM Kill any existing Chatlings Server processes
for /f "tokens=2" %%i in ('tasklist /fi "windowtitle eq Chatlings Server" /fo csv /nh 2^>nul ^| find "node.exe"') do (
    echo Stopping existing Chatlings Server...
    taskkill /pid %%i /f >nul 2>&1
)

REM Kill any existing Perchance ZIP Watcher processes
for /f "tokens=2" %%i in ('tasklist /fi "windowtitle eq Perchance ZIP Watcher" /fo csv /nh 2^>nul ^| find "node.exe"') do (
    echo Stopping existing Perchance ZIP Watcher...
    taskkill /pid %%i /f >nul 2>&1
)

REM Alternative: Kill by command line if window titles don't match
wmic process where "commandline like '%%admin-server.js%%'" delete >nul 2>&1
wmic process where "commandline like '%%perchance-watcher.js%%'" delete >nul 2>&1

echo All existing services stopped.
echo.

echo Checking dependencies...
call npm install
echo.

echo Starting Chatlings Server (Admin + User Hub)...
echo Admin Console: http://localhost:3000
echo User Hub: http://localhost:3000/user
echo.

START "Chatlings Server" node admin-server.js

echo.
echo Starting Perchance ZIP Watcher...
echo Watching artwork folder for new ZIP files...
echo.

START "Perchance ZIP Watcher" node perchance-watcher.js

echo.
echo ================================================================================
echo All services started!
echo ================================================================================
echo.
echo Open windows:
echo   - Chatlings Server (Admin + User Hub)
echo     * Admin Console: http://localhost:3000
echo     * User Hub: http://localhost:3000/user/login.html
echo   - Perchance ZIP Watcher (artwork folder monitoring)
echo.
echo Privacy-First YouTube Likes System Active!
echo   - Session-based OAuth (no long-term storage)
echo   - On-demand reward claiming
echo   - 24hr video-chatling mappings
echo.
echo Close those windows to stop the services.
echo ================================================================================
echo.

pause
