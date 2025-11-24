# Chatlings Azure Deployment - Quick Start

## What You Need

### 1. Azure Account
- Sign up at [azure.microsoft.com](https://azure.microsoft.com)
- Get $200 free credit for new users

### 2. Secrets to Gather
- [ ] Database password (strong, 16+ characters)
- [ ] Session secret (generate with: `openssl rand -base64 32`)
- [ ] Google OAuth Client ID & Secret ([Get here](https://console.cloud.google.com/apis/credentials))
- [ ] YouTube API Key ([Get here](https://console.cloud.google.com/apis/credentials))

### 3. Tools to Install
```bash
# Install Azure CLI
# Windows:
winget install Microsoft.AzureCLI

# Mac:
brew install azure-cli

# Linux:
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login
az login
```

---

## Quick Deployment (5 Minutes)

### Step 1: Update Parameters

Edit `parameters.json` and add your secrets:

```json
{
  "parameters": {
    "googleClientId": { "value": "YOUR_CLIENT_ID" },
    "googleClientSecret": { "value": "YOUR_CLIENT_SECRET" },
    "youtubeApiKey": { "value": "YOUR_API_KEY" },
    "dbAdminPassword": { "value": "YOUR_DB_PASSWORD" },
    "sessionSecret": { "value": "YOUR_SESSION_SECRET" }
  }
}
```

### Step 2: Deploy

**Windows:**
```powershell
cd azure
.\deploy.ps1 -Environment dev
```

**Mac/Linux:**
```bash
cd azure
chmod +x deploy.sh
./deploy.sh dev
```

Wait 10-15 minutes for deployment to complete.

### Step 3: Deploy Application

```bash
# Create deployment package
cd ..
npm ci --production
zip -r chatlings.zip .

# Deploy (replace with your app name from outputs)
az webapp deploy \
  --resource-group chatlings-dev-rg \
  --name app-chatlings-dev-xxxxx \
  --src-path chatlings.zip \
  --type zip
```

### Step 4: Initialize Database

```bash
# Set environment variables from deployment outputs
export DB_HOST="your-postgres-host.postgres.database.azure.com"
export DB_NAME="chatlings"
export DB_USER="chatlings_admin"
export DB_PASSWORD="your-password"
export DB_SSL="true"

# Run migrations
node scripts/setup-database.js
```

### Step 5: Test

Visit the URL from deployment outputs:
```
https://app-chatlings-dev-xxxxx.azurewebsites.net
```

---

## Cost Estimates

### Development ($46/month)
- App Service B1: $13
- PostgreSQL Burstable: $12
- Redis Basic: $16
- Storage: $5

### Production Small ($405/month)
- App Service P1V3: $117
- PostgreSQL D2s_v3: $144
- Redis Standard C1: $76
- CDN + Storage: $55
- Monitoring: $13

### Production Medium ($2,019/month)
- App Service P2V3 (3x): $704
- PostgreSQL D4s_v3: $288
- Redis Premium P1: $604
- CDN + Storage: $370
- Monitoring: $53

---

## Files Created

```
azure/
├── main.bicep                 # Infrastructure template
├── parameters.json            # Development config
├── parameters.prod.json       # Production config
├── deploy.ps1                 # Windows deployment script
├── deploy.sh                  # Mac/Linux deployment script
└── README.md                  # This file

config/
└── redis.js                   # Redis client & cache manager

docs/
├── AZURE_ARCHITECTURE.md              # Architecture overview
├── AZURE_PERFORMANCE_OPTIMIZATION.md  # Performance guide
└── AZURE_SETUP_GUIDE.md              # Complete setup instructions
```

---

## Environments

### Development
- **Purpose:** Testing and development
- **Cost:** ~$46/month
- **SKU:** Basic tier services
- **Command:** `deploy.ps1 -Environment dev`

### Staging (Optional)
- **Purpose:** Pre-production testing
- **Cost:** ~$200/month
- **SKU:** Standard tier services
- **Command:** `deploy.ps1 -Environment staging`

### Production
- **Purpose:** Live application
- **Cost:** $405-$2,019/month
- **SKU:** Premium tier services
- **Command:** `deploy.ps1 -Environment prod`

---

## Architecture Overview

```
Internet
   ↓
Azure Front Door (CDN + WAF)
   ↓
App Service (Node.js)
   ↓
├─→ PostgreSQL Database
├─→ Redis Cache
├─→ Blob Storage
├─→ Key Vault (secrets)
└─→ Application Insights (monitoring)
```

---

## Key Features

### Security
- ✅ HTTPS only
- ✅ Secrets in Key Vault
- ✅ Database SSL required
- ✅ Redis TLS enabled
- ✅ WAF protection

### Performance
- ✅ Redis caching (optional, see optimization guide)
- ✅ CDN for static assets
- ✅ Connection pooling
- ✅ Auto-scaling
- ✅ Compression enabled

### Reliability
- ✅ Daily database backups (35 days)
- ✅ High availability option
- ✅ Auto-restart on failure
- ✅ Health monitoring
- ✅ Geographic redundancy (optional)

---

## Next Steps

1. **Read the guides:**
   - [AZURE_SETUP_GUIDE.md](../docs/AZURE_SETUP_GUIDE.md) - Complete setup walkthrough
   - [AZURE_ARCHITECTURE.md](../docs/AZURE_ARCHITECTURE.md) - Architecture details
   - [AZURE_PERFORMANCE_OPTIMIZATION.md](../docs/AZURE_PERFORMANCE_OPTIMIZATION.md) - Performance tuning

2. **Implement Redis caching:** See optimization guide for 80%+ performance improvement

3. **Set up monitoring:** Configure alerts in Azure Monitor

4. **Configure CI/CD:** Automate deployments with GitHub Actions

5. **Add custom domain:** Point your domain to the app

---

## Common Commands

```bash
# View deployment outputs
cat deployment-outputs-dev.json

# Check app logs
az webapp log tail --resource-group chatlings-dev-rg --name app-chatlings-dev-xxxxx

# Restart app
az webapp restart --resource-group chatlings-dev-rg --name app-chatlings-dev-xxxxx

# Update app settings
az webapp config appsettings set --resource-group chatlings-dev-rg --name app-chatlings-dev-xxxxx --settings KEY=VALUE

# Scale up
az webapp update --resource-group chatlings-dev-rg --name app-chatlings-dev-xxxxx --set tags.sku=P2V3

# Delete everything (be careful!)
az group delete --name chatlings-dev-rg --yes
```

---

## Support

- **Documentation:** See [docs/](../docs/) folder
- **Azure Docs:** https://docs.microsoft.com/azure/
- **Issues:** Create GitHub issue
- **Emergency:** Check logs in Azure Portal

---

## Troubleshooting

### Deployment fails
- Check parameters file for typos
- Verify subscription has quota
- Check Azure Portal for detailed error

### App won't start
- Check logs: `az webapp log tail`
- Verify environment variables set
- Test database connection

### Can't connect to database
- Check firewall rules allow Azure services
- Verify SSL enabled in connection string
- Test with psql client

---

## Clean Up

To delete all resources and stop billing:

```bash
# Development
az group delete --name chatlings-dev-rg --yes

# Production (BE CAREFUL!)
az group delete --name chatlings-prod-rg --yes
```

---

**Ready to deploy? Start with the [AZURE_SETUP_GUIDE.md](../docs/AZURE_SETUP_GUIDE.md)!**
