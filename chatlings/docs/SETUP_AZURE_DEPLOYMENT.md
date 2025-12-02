# Setup Azure Continuous Deployment from GitHub

Your Azure deployment isn't automatically pulling from GitHub. Here's how to fix it:

## Option 1: Azure Portal (Easiest)

1. **Open Azure Portal**: https://portal.azure.com
2. **Find your App Service**: Search for "app-chatlings-dev"
3. **Go to Deployment Center**:
   - Click "Deployment Center" in the left sidebar
4. **Configure GitHub**:
   - Click "Settings" at the top
   - Source: Select **"GitHub"**
   - Click "Authorize" and sign in to GitHub
   - Organization: Select your GitHub username
   - Repository: Select **"chatlings"** (or your repo name)
   - Branch: Select **"main"**
5. **Save**

Azure will now automatically deploy whenever you push to GitHub!

## Option 2: Using Azure CLI

```bash
# Set up GitHub deployment
az webapp deployment source config --name app-chatlings-dev --resource-group chatlings-dev-rg --repo-url https://github.com/YOUR_USERNAME/chatlings.git --branch main --manual-integration

# Or if you want auto-sync (requires GitHub token):
az webapp deployment source config --name app-chatlings-dev --resource-group chatlings-dev-rg --repo-url https://github.com/YOUR_USERNAME/chatlings.git --branch main --git-token YOUR_GITHUB_TOKEN
```

## Verify Deployment is Working

After setup, push a small change:

```bash
# Make a small change
echo "# Test" >> README.md
git add README.md
git commit -m "Test deployment"
git push
```

Then watch in Azure Portal:
1. Go to **Deployment Center**
2. Click **Logs** tab
3. You should see a new deployment start within 30 seconds

## Current Issue

Your last deployment shows **Nov 26**, but you've pushed code today (Nov 27).

This means GitHub → Azure auto-deployment is **not configured**.

## Manual Deployment (Temporary Fix)

Until you set up auto-deployment, you can deploy manually:

### Using Azure CLI

```bash
cd chatlings
az webapp up --name app-chatlings-dev --resource-group chatlings-dev-rg
```

This will manually push your current code to Azure.

### Using Git Push to Azure

```bash
# Get your Azure Git URL
az webapp deployment source config-local-git --name app-chatlings-dev --resource-group chatlings-dev-rg

# Add Azure as a git remote
git remote add azure <the-url-from-above>

# Push to Azure
git push azure main
```

## Recommended: Fix Auto-Deployment

Set it up in Azure Portal (Option 1 above) so you don't have to manually deploy every time.
