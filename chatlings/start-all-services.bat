@echo off
echo ================================================================================
echo Starting Chatlings Services
echo ================================================================================
echo.

echo Starting Admin Console Server...
echo Server will be available at: http://localhost:3000
echo.

START "Chatlings Admin Server" node admin-server.js

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
echo   - Chatlings Admin Server (http://localhost:3000)
echo   - Perchance ZIP Watcher (artwork folder monitoring)
echo.
echo Close those windows to stop the services.
echo ================================================================================
echo.

pause
