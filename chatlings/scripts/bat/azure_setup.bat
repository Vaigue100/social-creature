@echo off
REM Azure Infrastructure Setup for Chatlings
REM This script creates Azure resources using Azure CLI

echo ========================================
echo Chatlings Azure Setup
echo ========================================
echo.

REM Check if Azure CLI is installed
az --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Azure CLI is not installed
    echo Please install from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli
    pause
    exit /b 1
)

REM Configuration
set RESOURCE_GROUP=chatlings-rg
set LOCATION=eastus
set DB_SERVER_NAME=chatlings-db-server
set DB_NAME=chatlings
set DB_ADMIN_USER=chatadmin
set WEB_APP_NAME=chatlings-api
set STORAGE_ACCOUNT=chatlingsstorage

echo.
echo Configuration:
echo - Resource Group: %RESOURCE_GROUP%
echo - Location: %LOCATION%
echo - Database Server: %DB_SERVER_NAME%
echo - Web App: %WEB_APP_NAME%
echo.
echo Press any key to continue or Ctrl+C to cancel...
pause >nul

echo.
echo Logging into Azure...
call az login

if %ERRORLEVEL% NEQ 0 goto error

echo.
echo Creating resource group...
call az group create --name %RESOURCE_GROUP% --location %LOCATION%
if %ERRORLEVEL% NEQ 0 goto error

echo.
echo Creating PostgreSQL server...
echo Please enter a password for the database admin:
set /p DB_ADMIN_PASSWORD=Password:
call az postgres server create ^
    --resource-group %RESOURCE_GROUP% ^
    --name %DB_SERVER_NAME% ^
    --location %LOCATION% ^
    --admin-user %DB_ADMIN_USER% ^
    --admin-password %DB_ADMIN_PASSWORD% ^
    --sku-name B_Gen5_1 ^
    --version 14
if %ERRORLEVEL% NEQ 0 goto error

echo.
echo Creating database...
call az postgres db create ^
    --resource-group %RESOURCE_GROUP% ^
    --server-name %DB_SERVER_NAME% ^
    --name %DB_NAME%
if %ERRORLEVEL% NEQ 0 goto error

echo.
echo Configuring firewall rules...
call az postgres server firewall-rule create ^
    --resource-group %RESOURCE_GROUP% ^
    --server-name %DB_SERVER_NAME% ^
    --name AllowAllAzureIPs ^
    --start-ip-address 0.0.0.0 ^
    --end-ip-address 0.0.0.0
if %ERRORLEVEL% NEQ 0 goto error

echo.
echo Creating storage account...
call az storage account create ^
    --name %STORAGE_ACCOUNT% ^
    --resource-group %RESOURCE_GROUP% ^
    --location %LOCATION% ^
    --sku Standard_LRS
if %ERRORLEVEL% NEQ 0 goto error

echo.
echo Creating App Service Plan...
call az appservice plan create ^
    --name %WEB_APP_NAME%-plan ^
    --resource-group %RESOURCE_GROUP% ^
    --sku B1 ^
    --is-linux
if %ERRORLEVEL% NEQ 0 goto error

echo.
echo Creating Web App...
call az webapp create ^
    --resource-group %RESOURCE_GROUP% ^
    --plan %WEB_APP_NAME%-plan ^
    --name %WEB_APP_NAME% ^
    --runtime "NODE:18-lts"
if %ERRORLEVEL% NEQ 0 goto error

echo.
echo ========================================
echo Azure setup completed successfully!
echo ========================================
echo.
echo Resources created:
echo - Resource Group: %RESOURCE_GROUP%
echo - PostgreSQL Server: %DB_SERVER_NAME%.postgres.database.azure.com
echo - Database: %DB_NAME%
echo - Web App: %WEB_APP_NAME%.azurewebsites.net
echo - Storage Account: %STORAGE_ACCOUNT%
echo.
echo Next steps:
echo 1. Configure Web App environment variables
echo 2. Deploy application code
echo 3. Run database migrations
echo.
pause
exit /b 0

:error
echo.
echo ========================================
echo ERROR: Azure setup failed!
echo ========================================
pause
exit /b 1
