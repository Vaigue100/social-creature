// Chatlings Azure Infrastructure - Main Bicep Template
// This template deploys the complete infrastructure for Chatlings

targetScope = 'resourceGroup'

// ========================================
// PARAMETERS
// ========================================

@description('Environment name (dev, staging, prod)')
@allowed([
  'dev'
  'staging'
  'prod'
])
param environment string = 'dev'

@description('Azure region for resources')
param location string = resourceGroup().location

@description('Unique prefix for resource names')
@minLength(3)
@maxLength(10)
param projectName string = 'chatlings'

@description('Administrator login for PostgreSQL')
param dbAdminUsername string = 'chatlings_admin'

@description('Administrator password for PostgreSQL')
@secure()
param dbAdminPassword string

@description('Session secret for Express')
@secure()
param sessionSecret string

@description('Google OAuth Client ID')
param googleClientId string

@description('Google OAuth Client Secret')
@secure()
param googleClientSecret string

@description('YouTube API Key')
@secure()
param youtubeApiKey string

@description('App Service SKU')
@allowed([
  'B1' // Basic - Dev/Test
  'B2' // Basic - Dev/Test
  'S1' // Standard - Small Production
  'P1V3' // Premium V3 - Production
  'P2V3' // Premium V3 - Production (Recommended)
])
param appServiceSku string = 'B1'

@description('PostgreSQL SKU')
@allowed([
  'Standard_B1ms' // Burstable - Dev/Test
  'Standard_B2s' // Burstable - Dev/Test
  'Standard_D2s_v3' // General Purpose - Production
  'Standard_D4s_v3' // General Purpose - Production (Recommended)
])
param postgresqlSku string = 'Standard_B1ms'

@description('Redis SKU')
@allowed([
  'Basic' // Basic tier
  'Standard' // Standard tier (Recommended for prod)
  'Premium' // Premium tier (High availability)
])
param redisSku string = 'Basic'

@description('Redis capacity')
@allowed([
  0 // 250 MB
  1 // 1 GB
  2 // 2.5 GB
  3 // 6 GB
  4 // 13 GB
  5 // 26 GB
  6 // 53 GB
])
param redisCapacity int = 0

// ========================================
// VARIABLES
// ========================================

var uniqueSuffix = uniqueString(resourceGroup().id)
var resourceSuffix = '${projectName}-${environment}'
var appServiceName = 'app-${resourceSuffix}'
var appServicePlanName = 'plan-${resourceSuffix}'
var postgresqlServerName = 'psql-${projectName}-${environment}-${take(uniqueSuffix, 6)}'
var redisName = 'redis-${projectName}-${environment}-${take(uniqueSuffix, 6)}'
var storageAccountName = '${replace(projectName, '-', '')}${environment}${take(uniqueSuffix, 6)}'
var keyVaultName = 'kv-${projectName}${environment}${take(uniqueSuffix, 6)}'
var appInsightsName = 'appi-${resourceSuffix}'
var logAnalyticsName = 'log-${resourceSuffix}'

// ========================================
// LOG ANALYTICS WORKSPACE
// ========================================

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: logAnalyticsName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// ========================================
// APPLICATION INSIGHTS
// ========================================

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'Node.JS'
    WorkspaceResourceId: logAnalytics.id
    IngestionMode: 'LogAnalytics'
  }
}

// ========================================
// STORAGE ACCOUNT
// ========================================

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: environment == 'prod' ? 'Standard_ZRS' : 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: true
    networkAcls: {
      defaultAction: 'Allow'
      bypass: 'AzureServices'
    }
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  parent: storageAccount
  name: 'default'
  properties: {
    cors: {
      corsRules: [
        {
          allowedOrigins: [
            '*'
          ]
          allowedMethods: [
            'GET'
            'HEAD'
            'OPTIONS'
          ]
          allowedHeaders: [
            '*'
          ]
          exposedHeaders: [
            '*'
          ]
          maxAgeInSeconds: 3600
        }
      ]
    }
  }
}

resource assetsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: blobService
  name: 'assets'
  properties: {
    publicAccess: 'Blob'
  }
}

resource artworkContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: blobService
  name: 'artwork'
  properties: {
    publicAccess: 'Blob'
  }
}

// ========================================
// AZURE CACHE FOR REDIS
// ========================================

resource redis 'Microsoft.Cache/redis@2023-08-01' = {
  name: redisName
  location: location
  properties: {
    sku: {
      name: redisSku
      family: redisSku == 'Premium' ? 'P' : 'C'
      capacity: redisCapacity
    }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
    publicNetworkAccess: 'Enabled'
    redisConfiguration: {
      'maxmemory-policy': 'allkeys-lru'
    }
  }
}

// ========================================
// AZURE DATABASE FOR POSTGRESQL
// ========================================

resource postgresqlServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-03-01-preview' = {
  name: postgresqlServerName
  location: location
  sku: {
    name: postgresqlSku
    tier: startsWith(postgresqlSku, 'Standard_B') ? 'Burstable' : 'GeneralPurpose'
  }
  properties: {
    version: '15'
    administratorLogin: dbAdminUsername
    administratorLoginPassword: dbAdminPassword
    storage: {
      storageSizeGB: 128
      autoGrow: 'Enabled'
    }
    backup: {
      backupRetentionDays: 35
      geoRedundantBackup: environment == 'prod' ? 'Enabled' : 'Disabled'
    }
    highAvailability: {
      mode: environment == 'prod' ? 'ZoneRedundant' : 'Disabled'
    }
  }
}

resource postgresqlDatabase 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-03-01-preview' = {
  parent: postgresqlServer
  name: 'chatlings'
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

resource postgresqlFirewallRule 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-03-01-preview' = {
  parent: postgresqlServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// ========================================
// KEY VAULT
// ========================================

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: false
    accessPolicies: []
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
  }
}

// Store secrets in Key Vault
resource secretDbPassword 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'db-password'
  properties: {
    value: dbAdminPassword
  }
}

resource secretSessionSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'session-secret'
  properties: {
    value: sessionSecret
  }
}

resource secretGoogleClientSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'google-client-secret'
  properties: {
    value: googleClientSecret
  }
}

resource secretYoutubeApiKey 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'youtube-api-key'
  properties: {
    value: youtubeApiKey
  }
}

resource secretRedisKey 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'redis-key'
  properties: {
    value: redis.listKeys().primaryKey
  }
}

// ========================================
// APP SERVICE PLAN
// ========================================

resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: appServicePlanName
  location: location
  sku: {
    name: appServiceSku
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

// ========================================
// APP SERVICE (WEB APP)
// ========================================

resource appService 'Microsoft.Web/sites@2023-01-01' = {
  name: appServiceName
  location: location
  kind: 'app,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    clientAffinityEnabled: false
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      alwaysOn: appServiceSku != 'B1'
      http20Enabled: true
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      healthCheckPath: '/health'
      appSettings: [
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
        {
          name: 'ApplicationInsightsAgent_EXTENSION_VERSION'
          value: '~3'
        }
        {
          name: 'NODE_ENV'
          value: environment
        }
        {
          name: 'PORT'
          value: '8080'
        }
        {
          name: 'DB_HOST'
          value: postgresqlServer.properties.fullyQualifiedDomainName
        }
        {
          name: 'DB_PORT'
          value: '5432'
        }
        {
          name: 'DB_NAME'
          value: 'chatlings'
        }
        {
          name: 'DB_USER'
          value: dbAdminUsername
        }
        {
          name: 'DB_PASSWORD'
          value: '@Microsoft.KeyVault(SecretUri=${secretDbPassword.properties.secretUri})'
        }
        {
          name: 'DB_SSL'
          value: 'true'
        }
        {
          name: 'REDIS_HOST'
          value: redis.properties.hostName
        }
        {
          name: 'REDIS_PORT'
          value: '6380'
        }
        {
          name: 'REDIS_KEY'
          value: '@Microsoft.KeyVault(SecretUri=${secretRedisKey.properties.secretUri})'
        }
        {
          name: 'SESSION_SECRET'
          value: '@Microsoft.KeyVault(SecretUri=${secretSessionSecret.properties.secretUri})'
        }
        {
          name: 'GOOGLE_CLIENT_ID'
          value: googleClientId
        }
        {
          name: 'GOOGLE_CLIENT_SECRET'
          value: '@Microsoft.KeyVault(SecretUri=${secretGoogleClientSecret.properties.secretUri})'
        }
        {
          name: 'GOOGLE_CALLBACK_URL'
          value: 'https://${appServiceName}.azurewebsites.net/auth/google/callback'
        }
        {
          name: 'YOUTUBE_REDIRECT_URI'
          value: 'https://${appServiceName}.azurewebsites.net/api/auth/youtube/callback'
        }
        {
          name: 'YOUTUBE_API_KEY'
          value: '@Microsoft.KeyVault(SecretUri=${secretYoutubeApiKey.properties.secretUri})'
        }
        {
          name: 'STORAGE_ACCOUNT_NAME'
          value: storageAccount.name
        }
        {
          name: 'STORAGE_CONTAINER_NAME'
          value: 'assets'
        }
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '1'
        }
      ]
    }
  }
}

// Grant App Service access to Key Vault
resource keyVaultAccessPolicy 'Microsoft.KeyVault/vaults/accessPolicies@2023-07-01' = {
  parent: keyVault
  name: 'add'
  properties: {
    accessPolicies: [
      {
        tenantId: subscription().tenantId
        objectId: appService.identity.principalId
        permissions: {
          secrets: [
            'get'
            'list'
          ]
        }
      }
    ]
  }
}

// ========================================
// AUTOSCALE SETTINGS
// ========================================

resource autoScaleSettings 'Microsoft.Insights/autoscalesettings@2022-10-01' = if (environment == 'prod') {
  name: '${appServiceName}-autoscale'
  location: location
  properties: {
    enabled: true
    targetResourceUri: appServicePlan.id
    profiles: [
      {
        name: 'Auto scale based on CPU'
        capacity: {
          minimum: '2'
          maximum: '10'
          default: '2'
        }
        rules: [
          {
            metricTrigger: {
              metricName: 'CpuPercentage'
              metricResourceUri: appServicePlan.id
              timeGrain: 'PT1M'
              statistic: 'Average'
              timeWindow: 'PT5M'
              timeAggregation: 'Average'
              operator: 'GreaterThan'
              threshold: 70
            }
            scaleAction: {
              direction: 'Increase'
              type: 'ChangeCount'
              value: '1'
              cooldown: 'PT5M'
            }
          }
          {
            metricTrigger: {
              metricName: 'CpuPercentage'
              metricResourceUri: appServicePlan.id
              timeGrain: 'PT1M'
              statistic: 'Average'
              timeWindow: 'PT10M'
              timeAggregation: 'Average'
              operator: 'LessThan'
              threshold: 30
            }
            scaleAction: {
              direction: 'Decrease'
              type: 'ChangeCount'
              value: '1'
              cooldown: 'PT10M'
            }
          }
        ]
      }
    ]
  }
}

// ========================================
// OUTPUTS
// ========================================

output appServiceUrl string = 'https://${appService.properties.defaultHostName}'
output appServiceName string = appService.name
output postgresqlServerName string = postgresqlServer.name
output postgresqlFQDN string = postgresqlServer.properties.fullyQualifiedDomainName
output redisHostName string = redis.properties.hostName
output storageAccountName string = storageAccount.name
output keyVaultName string = keyVault.name
output appInsightsInstrumentationKey string = appInsights.properties.InstrumentationKey
output appInsightsConnectionString string = appInsights.properties.ConnectionString
output resourceGroupName string = resourceGroup().name
