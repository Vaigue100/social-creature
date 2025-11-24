#!/bin/bash
# Chatlings Azure Deployment Script (Bash)
# This script deploys the Chatlings infrastructure to Azure

set -e

# Default values
ENVIRONMENT="${1:-dev}"
RESOURCE_GROUP_NAME="chatlings-${ENVIRONMENT}-rg"
LOCATION="${2:-eastus2}"

# Colors for output
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}========================================"
echo "Chatlings Azure Deployment"
echo -e "========================================${NC}\n"

# Display deployment info
echo -e "${YELLOW}Environment:      $ENVIRONMENT${NC}"
echo -e "${YELLOW}Resource Group:   $RESOURCE_GROUP_NAME${NC}"
echo -e "${YELLOW}Location:         $LOCATION${NC}\n"

# Confirmation
read -p "Do you want to proceed with deployment? (yes/no): " -r
if [[ ! $REPLY =~ ^yes$ ]]; then
    echo -e "${RED}Deployment cancelled.${NC}"
    exit 1
fi

# Check Azure CLI installation
echo -e "\n${CYAN}Checking Azure CLI installation...${NC}"
if ! command -v az &> /dev/null; then
    echo -e "${RED}✗ Azure CLI is not installed. Please install from: https://aka.ms/installazureclilinux${NC}"
    exit 1
fi

AZ_VERSION=$(az version --query '\"azure-cli\"' -o tsv)
echo -e "${GREEN}✓ Azure CLI version: $AZ_VERSION${NC}"

# Check Bicep installation
echo -e "\n${CYAN}Checking Bicep installation...${NC}"
if ! az bicep version &> /dev/null; then
    echo -e "${YELLOW}Installing Bicep...${NC}"
    az bicep install
fi

BICEP_VERSION=$(az bicep version)
echo -e "${GREEN}✓ Bicep version: $BICEP_VERSION${NC}"

# Login to Azure
echo -e "\n${CYAN}Checking Azure login status...${NC}"
if ! az account show &> /dev/null; then
    echo -e "${YELLOW}Not logged in. Logging in to Azure...${NC}"
    az login
fi

ACCOUNT_NAME=$(az account show --query user.name -o tsv)
SUBSCRIPTION_NAME=$(az account show --query name -o tsv)
echo -e "${GREEN}✓ Logged in as: $ACCOUNT_NAME${NC}"
echo -e "${GREEN}✓ Subscription: $SUBSCRIPTION_NAME${NC}"

# Create Resource Group
echo -e "\n${CYAN}Creating resource group '$RESOURCE_GROUP_NAME'...${NC}"
az group create \
    --name "$RESOURCE_GROUP_NAME" \
    --location "$LOCATION" \
    --output table

echo -e "${GREEN}✓ Resource group created${NC}"

# Select parameters file
if [ "$ENVIRONMENT" == "prod" ]; then
    PARAMETERS_FILE="parameters.prod.json"
else
    PARAMETERS_FILE="parameters.json"
fi

echo -e "\n${YELLOW}Using parameters file: $PARAMETERS_FILE${NC}"

# Deploy infrastructure
echo -e "\n${CYAN}Deploying infrastructure (this may take 10-15 minutes)...${NC}"
echo -e "${YELLOW}You can monitor the deployment in the Azure Portal.${NC}"

DEPLOYMENT_NAME="chatlings-${ENVIRONMENT}-$(date +%Y%m%d%H%M%S)"

DEPLOYMENT_OUTPUT=$(az deployment group create \
    --name "$DEPLOYMENT_NAME" \
    --resource-group "$RESOURCE_GROUP_NAME" \
    --template-file "main.bicep" \
    --parameters "@$PARAMETERS_FILE" \
    --output json)

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✓ Deployment completed successfully!${NC}"

    # Display outputs
    echo -e "\n${CYAN}========================================"
    echo "Deployment Outputs"
    echo -e "========================================${NC}"

    APP_SERVICE_URL=$(echo "$DEPLOYMENT_OUTPUT" | jq -r '.properties.outputs.appServiceUrl.value')
    APP_SERVICE_NAME=$(echo "$DEPLOYMENT_OUTPUT" | jq -r '.properties.outputs.appServiceName.value')
    POSTGRESQL_SERVER=$(echo "$DEPLOYMENT_OUTPUT" | jq -r '.properties.outputs.postgresqlServerName.value')
    POSTGRESQL_FQDN=$(echo "$DEPLOYMENT_OUTPUT" | jq -r '.properties.outputs.postgresqlFQDN.value')
    REDIS_HOSTNAME=$(echo "$DEPLOYMENT_OUTPUT" | jq -r '.properties.outputs.redisHostName.value')
    STORAGE_ACCOUNT=$(echo "$DEPLOYMENT_OUTPUT" | jq -r '.properties.outputs.storageAccountName.value')
    KEY_VAULT=$(echo "$DEPLOYMENT_OUTPUT" | jq -r '.properties.outputs.keyVaultName.value')
    INSIGHTS_KEY=$(echo "$DEPLOYMENT_OUTPUT" | jq -r '.properties.outputs.appInsightsInstrumentationKey.value')

    echo -e "\n${YELLOW}App Service URL:       $APP_SERVICE_URL${NC}"
    echo -e "${YELLOW}App Service Name:      $APP_SERVICE_NAME${NC}"
    echo -e "${YELLOW}PostgreSQL Server:     $POSTGRESQL_SERVER${NC}"
    echo -e "${YELLOW}PostgreSQL FQDN:       $POSTGRESQL_FQDN${NC}"
    echo -e "${YELLOW}Redis Hostname:        $REDIS_HOSTNAME${NC}"
    echo -e "${YELLOW}Storage Account:       $STORAGE_ACCOUNT${NC}"
    echo -e "${YELLOW}Key Vault:             $KEY_VAULT${NC}"
    echo -e "${YELLOW}App Insights Key:      $INSIGHTS_KEY${NC}"

    echo -e "\n${CYAN}========================================"
    echo "Next Steps"
    echo -e "========================================${NC}"
    echo -e "${NC}1. Run database migrations:"
    echo -e "   ${YELLOW}node scripts/setup-database.js${NC}"
    echo -e "\n${NC}2. Deploy application code:"
    echo -e "   ${YELLOW}az webapp deploy --resource-group $RESOURCE_GROUP_NAME --name $APP_SERVICE_NAME --src-path ./chatlings.zip --type zip${NC}"
    echo -e "\n${NC}3. Configure custom domain (optional):"
    echo -e "   ${YELLOW}az webapp config hostname add --resource-group $RESOURCE_GROUP_NAME --webapp-name $APP_SERVICE_NAME --hostname yourdomain.com${NC}"
    echo -e "\n${NC}4. Enable deployment slots (staging):"
    echo -e "   ${YELLOW}az webapp deployment slot create --resource-group $RESOURCE_GROUP_NAME --name $APP_SERVICE_NAME --slot staging${NC}"

    # Save outputs to file
    echo "$DEPLOYMENT_OUTPUT" | jq '.properties.outputs' > "deployment-outputs-${ENVIRONMENT}.json"
    echo -e "\n${GREEN}✓ Deployment outputs saved to: deployment-outputs-${ENVIRONMENT}.json${NC}"

else
    echo -e "\n${RED}✗ Deployment failed. Check the error messages above.${NC}"
    exit 1
fi

echo -e "\n${CYAN}========================================"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${CYAN}========================================${NC}"
