@echo off
REM Check if chatlings database exists

echo ========================================
echo Checking Chatlings Database
echo ========================================
echo.

cd ..\..

echo Checking database connection...
node -e "const {Client} = require('pg'); const client = new Client({host: 'localhost', port: 5432, user: 'postgres', password: '!1Swagger!1', database: 'postgres'}); client.connect().then(() => client.query(\"SELECT 1 FROM pg_database WHERE datname = 'chatlings'\")).then(r => {console.log(r.rows.length > 0 ? '\n✓ Database EXISTS' : '\n✗ Database NOT FOUND'); return client.end();}).catch(e => {console.error('\n✗ Connection error:', e.message); process.exit(1)});"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Checking table count...
    node -e "const {Client} = require('pg'); const client = new Client({host: 'localhost', port: 5432, user: 'postgres', password: '!1Swagger!1', database: 'chatlings'}); client.connect().then(() => client.query(\"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'\")).then(r => {console.log('\nTables found:', r.rows[0].count); return client.end();}).catch(e => {console.error('\n✗ Error:', e.message); process.exit(1)});"

    echo.
    echo Checking creature count...
    node -e "const {Client} = require('pg'); const client = new Client({host: 'localhost', port: 5432, user: 'postgres', password: '!1Swagger!1', database: 'chatlings'}); client.connect().then(() => client.query('SELECT COUNT(*) FROM creatures')).then(r => {console.log('\nCreatures in database:', r.rows[0].count); return client.end();}).catch(e => {console.error('\n✗ Error:', e.message); process.exit(1)});"
)

echo.
echo ========================================
pause
