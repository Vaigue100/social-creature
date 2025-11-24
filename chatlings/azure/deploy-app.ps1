# Azure App Deployment Script
# This uses config-zip which triggers Oryx build system

Write-Host "========================================"
Write-Host "Chatlings Azure Deployment"
Write-Host "========================================"
Write-Host ""

$resourceGroup = "chatlings-dev-rg"
$appName = "app-chatlings-dev"
$zipPath = "C:\Users\Barney\chatlings-deploy.zip"

Write-Host "Deploying to Azure App Service..."
Write-Host "This will trigger npm install automatically"
Write-Host ""

# Use config-zip instead of deploy - this triggers build
az webapp deployment source config-zip `
    --resource-group $resourceGroup `
    --name $appName `
    --src $zipPath

Write-Host ""
Write-Host "Deployment initiated!"
Write-Host ""
Write-Host "Monitor deployment logs with:"
Write-Host "az webapp log tail --resource-group $resourceGroup --name $appName"
Write-Host ""
Write-Host "Or view in browser:"
Write-Host "https://app-chatlings-dev.scm.azurewebsites.net/api/deployments"
