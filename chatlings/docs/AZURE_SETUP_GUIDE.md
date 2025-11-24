# Chatlings Azure Setup Guide

## Complete Step-by-Step Instructions

This guide will walk you through deploying Chatlings to Azure from scratch.

---

## Prerequisites

### 1. Azure Account
- [ ] Sign up for Azure account at [azure.microsoft.com](https://azure.microsoft.com)
- [ ] For new users: Get $200 free credits
- [ ] Set up billing (credit card required, but free tier available)

### 2. Required Tools

**Windows:**
```powershell
# Install Azure CLI
winget install Microsoft.AzureCLI

# Install Node.js (if not already installed)
winget install OpenJS.NodeJS.LTS

# Install Git (if not already installed)
winget install Git.Git
```

**Mac/Linux:**
```bash
# Install Azure CLI (Mac)
brew install azure-cli

# Install Azure CLI (Linux)
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Node.js and Git should already be installed
```

### 3. Azure CLI Login

```bash
# Login to Azure
az login

# Verify login
az account show

# List available subscriptions
az account list --output table

# Set default subscription (if you have multiple)
az account set --subscription "Your Subscription Name"
```

---

## Step 1: Prepare Your Secrets

### 1.1 Generate Secure Secrets

```bash
# Generate session secret (Windows PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }))

# Generate session secret (Mac/Linux)
openssl rand -base64 32
```

### 1.2 Collect OAuth Credentials

**Google OAuth Setup:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable APIs:
   - Google+ API
   - YouTube Data API v3
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Application type: "Web application"
6. Authorized redirect URIs:
   - `http://localhost:3000/auth/google/callback` (development)
   - `https://your-app.azurewebsites.net/auth/google/callback` (production)
   - `https://your-app.azurewebsites.net/api/auth/youtube/callback` (YouTube)
7. Save the Client ID and Client Secret

**YouTube API Key:**
1. In same Google Cloud project
2. "Credentials" → "Create Credentials" → "API key"
3. Restrict the API key to YouTube Data API v3
4. Save the API key

### 1.3 Create Secrets Key Vault (Optional but Recommended)

```powershell
# Create resource group for secrets
az group create `
  --name chatlings-secrets-rg `
  --location eastus2

# Create Key Vault for deployment secrets
$vaultName = "chatlings-deploy-secrets"
az keyvault create `
  --name $vaultName `
  --resource-group chatlings-secrets-rg `
  --location eastus2

# Store secrets
az keyvault secret set --vault-name $vaultName --name "db-admin-password" --value "YourStrongPassword123!"
az keyvault secret set --vault-name $vaultName --name "session-secret" --value "YourGeneratedSessionSecret"
az keyvault secret set --vault-name $vaultName --name "google-client-secret" --value "YourGoogleClientSecret"
az keyvault secret set --vault-name $vaultName --name "youtube-api-key" --value "YourYouTubeAPIKey"

# Get Key Vault ID for parameters file
az keyvault show --name $vaultName --query id --output tsv
```

---

## Step 2: Configure Deployment Parameters

### 2.1 Edit Parameters File

Navigate to `chatlings/azure/` folder and edit the appropriate parameters file:

**For Development:**
Edit `parameters.json`:

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "environment": {
      "value": "dev"
    },
    "projectName": {
      "value": "chatlings"
    },
    "dbAdminUsername": {
      "value": "chatlings_admin"
    },
    "dbAdminPassword": {
      "value": "YourStrongPassword123!"
    },
    "sessionSecret": {
      "value": "YourGeneratedSessionSecret"
    },
    "googleClientId": {
      "value": "YOUR_GOOGLE_CLIENT_ID"
    },
    "googleClientSecret": {
      "value": "YOUR_GOOGLE_CLIENT_SECRET"
    },
    "youtubeApiKey": {
      "value": "YOUR_YOUTUBE_API_KEY"
    },
    "appServiceSku": {
      "value": "B1"
    },
    "postgresqlSku": {
      "value": "Standard_B1ms"
    },
    "redisSku": {
      "value": "Basic"
    },
    "redisCapacity": {
      "value": 0
    }
  }
}
```

**For Production:**
Edit `parameters.prod.json` with production-grade SKUs and use Key Vault references.

---

## Step 3: Deploy Infrastructure

### 3.1 Run Deployment Script

**Windows (PowerShell):**
```powershell
cd chatlings\azure

# Deploy to development
.\deploy.ps1 -Environment dev -Location eastus2

# Deploy to production
.\deploy.ps1 -Environment prod -Location eastus2
```

**Mac/Linux (Bash):**
```bash
cd chatlings/azure

# Make script executable
chmod +x deploy.sh

# Deploy to development
./deploy.sh dev eastus2

# Deploy to production
./deploy.sh prod eastus2
```

### 3.2 Wait for Deployment

- Deployment takes 10-15 minutes
- Monitor progress in Azure Portal
- Script will output deployment status

### 3.3 Save Deployment Outputs

The script creates `deployment-outputs-{environment}.json` with:
- App Service URL
- Database connection details
- Redis hostname
- Storage account name
- Key Vault name

**Keep this file secure** - it contains important configuration info.

---

## Step 4: Prepare Application Code

### 4.1 Install Redis Dependencies

```bash
cd chatlings
npm install redis connect-redis
```

### 4.2 Update Application to Use Redis

Your `admin-server.js` needs to be updated to use Redis for sessions:

```javascript
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const { getClient } = require('./config/redis');

// Initialize Redis (only in Azure environment)
if (process.env.REDIS_HOST) {
  const redisClient = await getClient();

  app.use(session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000
    }
  }));
} else {
  // Development: use default memory store
  app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
  }));
}
```

### 4.3 Add Health Check Endpoint

Add to `admin-server.js`:

```javascript
app.get('/health', async (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});
```

---

## Step 5: Deploy Application Code

### 5.1 Create Deployment Package

```bash
cd chatlings

# Install production dependencies only
npm ci --production

# Create zip file (Windows PowerShell)
Compress-Archive -Path * -DestinationPath chatlings.zip -Force

# Create zip file (Mac/Linux)
zip -r chatlings.zip . -x "node_modules/*" "*.git/*" "azure/*"

# Reinstall all dependencies (including dev)
npm install
```

### 5.2 Deploy to App Service

```bash
# Get app name from deployment outputs
$appName = "app-chatlings-dev-xxxxx"  # From deployment-outputs-dev.json
$resourceGroup = "chatlings-dev-rg"

# Deploy zip file
az webapp deploy `
  --resource-group $resourceGroup `
  --name $appName `
  --src-path chatlings.zip `
  --type zip `
  --async true

# Monitor deployment
az webapp log tail `
  --resource-group $resourceGroup `
  --name $appName
```

---

## Step 6: Initialize Database

### 6.1 Get Database Connection String

From `deployment-outputs-{environment}.json`:
- PostgreSQL FQDN
- Database name: `chatlings`
- Username: `chatlings_admin`
- Password: (from your parameters or Key Vault)

### 6.2 Connect and Run Migrations

**Option A: Run from Azure Cloud Shell**

```bash
# Install psql in Cloud Shell if needed
az postgres flexible-server connect `
  --name $postgresqlServerName `
  --admin-user chatlings_admin `
  --admin-password 'YourPassword' `
  --database-name chatlings

# Run your SQL migrations
\i path/to/your/migrations.sql
```

**Option B: Run from local machine**

```bash
# Set environment variables
$env:DB_HOST = "psql-chatlings-dev-xxxxx.postgres.database.azure.com"
$env:DB_NAME = "chatlings"
$env:DB_USER = "chatlings_admin"
$env:DB_PASSWORD = "YourPassword"
$env:DB_SSL = "true"

# Run setup script
node scripts/setup-database.js

# Run any additional migrations
node scripts/run-migration-XX.js
```

---

## Step 7: Configure Custom Domain (Optional)

### 7.1 Add Custom Domain

```bash
# Add your domain
az webapp config hostname add `
  --resource-group $resourceGroup `
  --webapp-name $appName `
  --hostname yourdomain.com

# Get hostname binding ID
az webapp config hostname list `
  --resource-group $resourceGroup `
  --webapp-name $appName

# Create managed SSL certificate (free)
az webapp config ssl create `
  --resource-group $resourceGroup `
  --name $appName `
  --hostname yourdomain.com

# Bind SSL certificate
az webapp config ssl bind `
  --resource-group $resourceGroup `
  --name $appName `
  --certificate-thumbprint {thumbprint} `
  --ssl-type SNI
```

### 7.2 Update DNS Records

In your domain registrar, add:

**For root domain (yourdomain.com):**
```
Type: A
Name: @
Value: [App Service IP - get from portal]
TTL: 3600
```

**For www subdomain:**
```
Type: CNAME
Name: www
Value: app-chatlings-dev-xxxxx.azurewebsites.net
TTL: 3600
```

**Verification record:**
```
Type: TXT
Name: asuid.yourdomain.com
Value: [Custom domain verification ID - get from portal]
TTL: 3600
```

---

## Step 8: Configure CI/CD (Optional)

### 8.1 GitHub Actions Deployment

Create `.github/workflows/azure-deploy.yml`:

```yaml
name: Deploy to Azure

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  AZURE_WEBAPP_NAME: app-chatlings-prod-xxxxx
  NODE_VERSION: '18.x'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run tests
      run: npm test

    - name: Build application
      run: npm run build --if-present

    - name: Deploy to Azure
      uses: azure/webapps-deploy@v2
      with:
        app-name: ${{ env.AZURE_WEBAPP_NAME }}
        publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
        package: .
```

### 8.2 Get Publish Profile

```bash
# Download publish profile
az webapp deployment list-publishing-profiles `
  --resource-group $resourceGroup `
  --name $appName `
  --xml `
  > publish-profile.xml

# Add to GitHub secrets as AZURE_WEBAPP_PUBLISH_PROFILE
```

---

## Step 9: Monitoring and Alerts

### 9.1 Access Application Insights

1. Go to Azure Portal
2. Navigate to your App Insights resource
3. Explore:
   - Live Metrics
   - Performance
   - Failures
   - Users/Sessions

### 9.2 Set Up Alerts

```bash
# Create alert for high response time
az monitor metrics alert create `
  --name "High Response Time" `
  --resource-group $resourceGroup `
  --scopes "/subscriptions/{subscription-id}/resourceGroups/$resourceGroup/providers/Microsoft.Web/sites/$appName" `
  --condition "avg ResponseTime > 2000" `
  --window-size 5m `
  --evaluation-frequency 1m `
  --action-group {action-group-id}

# Create alert for high error rate
az monitor metrics alert create `
  --name "High Error Rate" `
  --resource-group $resourceGroup `
  --scopes "/subscriptions/{subscription-id}/resourceGroups/$resourceGroup/providers/Microsoft.Web/sites/$appName" `
  --condition "total Http5xx > 10" `
  --window-size 5m `
  --evaluation-frequency 1m
```

---

## Step 10: Testing

### 10.1 Verify Deployment

```bash
# Get app URL from deployment outputs
$appUrl = "https://app-chatlings-dev-xxxxx.azurewebsites.net"

# Test health endpoint
curl $appUrl/health

# Test home page
curl $appUrl

# Check logs
az webapp log tail --resource-group $resourceGroup --name $appName
```

### 10.2 Test OAuth Flow

1. Visit your app URL
2. Click "Login with Google"
3. Authorize the application
4. Verify you're redirected back

### 10.3 Test Database Connection

```bash
# Run a test query
node -e "
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false }
});
pool.query('SELECT NOW()').then(r => console.log(r.rows)).catch(console.error);
"
```

### 10.4 Test Redis Connection

```bash
# Test Redis
node -e "
const redis = require('redis');
const client = redis.createClient({
  socket: { host: process.env.REDIS_HOST, port: 6380, tls: true },
  password: process.env.REDIS_KEY
});
client.connect().then(() => {
  client.ping().then(r => console.log('Redis PONG:', r));
});
"
```

---

## Troubleshooting

### Issue: Deployment Failed

**Solution:**
```bash
# View deployment logs
az deployment group show `
  --resource-group $resourceGroup `
  --name $deploymentName

# Check activity log
az monitor activity-log list `
  --resource-group $resourceGroup `
  --max-events 20
```

### Issue: App Not Starting

**Solution:**
```bash
# Check app logs
az webapp log tail --resource-group $resourceGroup --name $appName

# Check container logs
az webapp log download --resource-group $resourceGroup --name $appName

# Restart app
az webapp restart --resource-group $resourceGroup --name $appName
```

### Issue: Database Connection Failed

**Solution:**
1. Verify firewall rules allow Azure services
2. Check connection string format
3. Verify SSL is enabled
4. Test connection with psql

```bash
# Add your IP to firewall
az postgres flexible-server firewall-rule create `
  --resource-group $resourceGroup `
  --name $postgresqlServerName `
  --rule-name AllowMyIP `
  --start-ip-address YOUR_IP `
  --end-ip-address YOUR_IP
```

### Issue: Redis Connection Failed

**Solution:**
1. Verify TLS is enabled in client configuration
2. Check Redis access keys
3. Verify port 6380 (not 6379)

```bash
# Get Redis keys
az redis list-keys `
  --resource-group $resourceGroup `
  --name $redisName
```

---

## Cost Management

### Monitor Costs

```bash
# View current month costs
az consumption usage list `
  --start-date 2024-01-01 `
  --end-date 2024-01-31 `
  --query "[].{Service:name.value, Cost:pretaxCost}" `
  --output table
```

### Cost Optimization Tips

1. **Development:**
   - Use B1 tier App Service ($13/month)
   - Use Burstable PostgreSQL ($12/month)
   - Use Basic Redis ($16/month)
   - Total: ~$46/month

2. **Auto-shutdown (Dev):**
   - Scale down to 0 instances when not in use
   - Use Azure Automation to schedule start/stop

3. **Right-sizing:**
   - Monitor actual resource usage
   - Scale down if over-provisioned
   - Use Reserved Instances for production (up to 72% savings)

---

## Maintenance

### Weekly Tasks
- [ ] Review Application Insights for errors
- [ ] Check database performance metrics
- [ ] Review Redis cache hit rates
- [ ] Check storage usage

### Monthly Tasks
- [ ] Review and optimize slow queries
- [ ] Update Node.js dependencies
- [ ] Review and adjust auto-scaling rules
- [ ] Backup verification test
- [ ] Cost review and optimization

### Quarterly Tasks
- [ ] Security audit
- [ ] Performance load testing
- [ ] Disaster recovery drill
- [ ] Architecture review

---

## Summary Checklist

- [ ] Azure account created and configured
- [ ] Azure CLI installed and logged in
- [ ] Secrets generated and stored securely
- [ ] Google OAuth configured with correct redirect URIs
- [ ] Parameters file updated with your values
- [ ] Infrastructure deployed successfully
- [ ] Application code updated for Azure
- [ ] Application deployed to App Service
- [ ] Database initialized with migrations
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate configured
- [ ] Monitoring and alerts set up
- [ ] All endpoints tested and working
- [ ] Documentation updated with your specific values

---

## Next Steps

1. Review [AZURE_PERFORMANCE_OPTIMIZATION.md](./AZURE_PERFORMANCE_OPTIMIZATION.md) to implement caching
2. Set up CI/CD pipeline for automated deployments
3. Configure backup and disaster recovery
4. Implement additional monitoring and alerts
5. Load test your application
6. Plan for scaling based on user growth

---

## Support Resources

- **Azure Documentation:** https://docs.microsoft.com/azure/
- **Azure CLI Reference:** https://docs.microsoft.com/cli/azure/
- **Bicep Documentation:** https://docs.microsoft.com/azure/azure-resource-manager/bicep/
- **Azure Support:** https://azure.microsoft.com/support/
- **Community Forum:** https://learn.microsoft.com/answers/

---

**Congratulations!** Your Chatlings application is now running on Azure with enterprise-grade infrastructure! 🎉
