# Chatlings Azure Deployment Script (PowerShell)
# This script deploys the Chatlings infrastructure to Azure

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('dev', 'staging', 'prod')]
    [string]$Environment = 'dev',

    [Parameter(Mandatory=$false)]
    [string]$ResourceGroupName = "chatlings-$Environment-rg",

    [Parameter(Mandatory=$false)]
    [string]$Location = 'eastus2',

    [Parameter(Mandatory=$false)]
    [switch]$SkipConfirmation
)

# Set error action preference
$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Chatlings Azure Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Display deployment info
Write-Host "Environment:      $Environment" -ForegroundColor Yellow
Write-Host "Resource Group:   $ResourceGroupName" -ForegroundColor Yellow
Write-Host "Location:         $Location" -ForegroundColor Yellow
Write-Host ""

# Confirmation
if (-not $SkipConfirmation) {
    $confirmation = Read-Host "Do you want to proceed with deployment? (yes/no)"
    if ($confirmation -ne 'yes') {
        Write-Host "Deployment cancelled." -ForegroundColor Red
        exit
    }
}

# Check Azure CLI installation
Write-Host "Checking Azure CLI installation..." -ForegroundColor Cyan
try {
    $azVersion = az version --output json | ConvertFrom-Json
    Write-Host "✓ Azure CLI version: $($azVersion.'azure-cli')" -ForegroundColor Green
} catch {
    Write-Host "✗ Azure CLI is not installed. Please install from: https://aka.ms/installazurecliwindows" -ForegroundColor Red
    exit 1
}

# Check Bicep installation
Write-Host "Checking Bicep installation..." -ForegroundColor Cyan
try {
    $bicepVersion = az bicep version
    Write-Host "✓ Bicep version: $bicepVersion" -ForegroundColor Green
} catch {
    Write-Host "Installing Bicep..." -ForegroundColor Yellow
    az bicep install
}

# Login to Azure
Write-Host "`nChecking Azure login status..." -ForegroundColor Cyan
$account = az account show 2>$null
if (-not $account) {
    Write-Host "Not logged in. Logging in to Azure..." -ForegroundColor Yellow
    az login
} else {
    $accountInfo = $account | ConvertFrom-Json
    Write-Host "✓ Logged in as: $($accountInfo.user.name)" -ForegroundColor Green
    Write-Host "✓ Subscription: $($accountInfo.name)" -ForegroundColor Green
}

# Create Resource Group
Write-Host "`nCreating resource group '$ResourceGroupName'..." -ForegroundColor Cyan
az group create `
    --name $ResourceGroupName `
    --location $Location `
    --output table

Write-Host "✓ Resource group created" -ForegroundColor Green

# Select parameters file
$parametersFile = if ($Environment -eq 'prod') {
    "parameters.prod.json"
} else {
    "parameters.json"
}

Write-Host "`nUsing parameters file: $parametersFile" -ForegroundColor Yellow

# Deploy infrastructure
Write-Host "`nDeploying infrastructure (this may take 10-15 minutes)..." -ForegroundColor Cyan
Write-Host "You can monitor the deployment in the Azure Portal." -ForegroundColor Yellow

$deploymentName = "chatlings-$Environment-$(Get-Date -Format 'yyyyMMddHHmmss')"

$deployment = az deployment group create `
    --name $deploymentName `
    --resource-group $ResourceGroupName `
    --template-file "main.bicep" `
    --parameters "@$parametersFile" `
    --output json | ConvertFrom-Json

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✓ Deployment completed successfully!" -ForegroundColor Green

    # Display outputs
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "Deployment Outputs" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan

    $outputs = $deployment.properties.outputs

    Write-Host "`nApp Service URL:       $($outputs.appServiceUrl.value)" -ForegroundColor Yellow
    Write-Host "App Service Name:      $($outputs.appServiceName.value)" -ForegroundColor Yellow
    Write-Host "PostgreSQL Server:     $($outputs.postgresqlServerName.value)" -ForegroundColor Yellow
    Write-Host "PostgreSQL FQDN:       $($outputs.postgresqlFQDN.value)" -ForegroundColor Yellow
    Write-Host "Redis Hostname:        $($outputs.redisHostName.value)" -ForegroundColor Yellow
    Write-Host "Storage Account:       $($outputs.storageAccountName.value)" -ForegroundColor Yellow
    Write-Host "Key Vault:             $($outputs.keyVaultName.value)" -ForegroundColor Yellow
    Write-Host "App Insights Key:      $($outputs.appInsightsInstrumentationKey.value)" -ForegroundColor Yellow

    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "Next Steps" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "1. Run database migrations:" -ForegroundColor White
    Write-Host "   node scripts/setup-database.js" -ForegroundColor Gray
    Write-Host "`n2. Deploy application code:" -ForegroundColor White
    Write-Host "   az webapp deploy --resource-group $ResourceGroupName --name $($outputs.appServiceName.value) --src-path ./chatlings.zip --type zip" -ForegroundColor Gray
    Write-Host "`n3. Configure custom domain (optional):" -ForegroundColor White
    Write-Host "   az webapp config hostname add --resource-group $ResourceGroupName --webapp-name $($outputs.appServiceName.value) --hostname yourdomain.com" -ForegroundColor Gray
    Write-Host "`n4. Enable deployment slots (staging):" -ForegroundColor White
    Write-Host "   az webapp deployment slot create --resource-group $ResourceGroupName --name $($outputs.appServiceName.value) --slot staging" -ForegroundColor Gray

    # Save outputs to file
    $outputs | ConvertTo-Json -Depth 10 | Out-File -FilePath "deployment-outputs-$Environment.json"
    Write-Host "`n✓ Deployment outputs saved to: deployment-outputs-$Environment.json" -ForegroundColor Green

} else {
    Write-Host "`n✗ Deployment failed. Check the error messages above." -ForegroundColor Red
    exit 1
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
