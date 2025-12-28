# AI Setup Quick Start Guide

## Choose Your Path

### Option A: Azure OpenAI (30 min setup)
**Best for:** Production, enterprise, existing Azure users

```bash
# 1. Create Azure OpenAI resource
az cognitiveservices account create \
  --name openai-chatlings \
  --resource-group rg-chatlings \
  --kind OpenAI \
  --sku S0 \
  --location eastus \
  --yes

# 2. Deploy GPT-3.5 Turbo model
az cognitiveservices account deployment create \
  --name openai-chatlings \
  --resource-group rg-chatlings \
  --deployment-name gpt-35-turbo \
  --model-name gpt-35-turbo \
  --model-version "0613" \
  --model-format OpenAI \
  --sku-capacity 120 \
  --sku-name "Standard"

# 3. Get credentials
ENDPOINT=$(az cognitiveservices account show \
  --name openai-chatlings \
  --resource-group rg-chatlings \
  --query properties.endpoint \
  --output tsv)

KEY=$(az cognitiveservices account keys list \
  --name openai-chatlings \
  --resource-group rg-chatlings \
  --query key1 \
  --output tsv)

# 4. Add to Key Vault
az keyvault secret set \
  --vault-name kv-chatlingsdevlyg7hq \
  --name AzureOpenAIEndpoint \
  --value "$ENDPOINT"

az keyvault secret set \
  --vault-name kv-chatlingsdevlyg7hq \
  --name AzureOpenAIKey \
  --value "$KEY"

# 5. Update App Service
az webapp config appsettings set \
  --name app-chatlings-dev \
  --resource-group rg-chatlings \
  --settings \
    AZURE_OPENAI_ENDPOINT="@Microsoft.KeyVault(SecretUri=https://kv-chatlingsdevlyg7hq.vault.azure.net/secrets/AzureOpenAIEndpoint/)" \
    AZURE_OPENAI_KEY="@Microsoft.KeyVault(SecretUri=https://kv-chatlingsdevlyg7hq.vault.azure.net/secrets/AzureOpenAIKey/)" \
    AZURE_OPENAI_DEPLOYMENT="gpt-35-turbo" \
    AI_PROVIDER="azure"

# 6. Install SDK
cd chatlings
npm install @azure/openai@^1.0.0
```

---

### Option B: Direct OpenAI (5 min setup)
**Best for:** Quick start, prototyping, simplicity

```bash
# 1. Get API key from https://platform.openai.com/api-keys
# (Copy the key that starts with sk-)

# 2. Add to Key Vault
az keyvault secret set \
  --vault-name kv-chatlingsdevlyg7hq \
  --name OpenAIAPIKey \
  --value "sk-your-key-here"

# 3. Update App Service
az webapp config appsettings set \
  --name app-chatlings-dev \
  --resource-group rg-chatlings \
  --settings \
    OPENAI_API_KEY="@Microsoft.KeyVault(SecretUri=https://kv-chatlingsdevlyg7hq.vault.azure.net/secrets/OpenAIAPIKey/)" \
    AI_PROVIDER="openai"

# 4. Install SDK
cd chatlings
npm install openai@^4.0.0
```

---

## Verification

Test your setup:

```javascript
// test-ai-setup.js
const { OpenAI } = require('openai');

async function testSetup() {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'user', content: 'Say "AI setup successful!"' }
    ]
  });

  console.log('✅ Response:', response.choices[0].message.content);
}

testSetup();
```

Run with:
```bash
node test-ai-setup.js
```

Expected output:
```
✅ Response: AI setup successful!
```

---

## Next Steps

Once setup is complete, let me know and I'll:
1. ✅ Create database migration (run-migration-56.js)
2. ✅ Build AI conversation generator
3. ✅ Build conversation customizer
4. ✅ Build API routes
5. ✅ Build frontend viewer
6. ✅ Set up daily job

---

## Cost Monitoring

Track your costs:

**Azure OpenAI:**
```bash
# View usage
az monitor metrics list \
  --resource /subscriptions/{sub-id}/resourceGroups/rg-chatlings/providers/Microsoft.CognitiveServices/accounts/openai-chatlings \
  --metric TotalTokens \
  --start-time 2025-01-01T00:00:00Z \
  --end-time 2025-01-31T23:59:59Z
```

**Direct OpenAI:**
- Dashboard: https://platform.openai.com/usage

Expected monthly cost: **~$1.60** for unlimited users
