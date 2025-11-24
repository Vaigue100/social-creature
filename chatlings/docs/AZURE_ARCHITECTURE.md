# Chatlings Azure Architecture

## Overview

This document describes the complete Azure cloud architecture for deploying the Chatlings application with high availability, scalability, and optimal performance.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Azure Front Door                          │
│                    (Global Load Balancer + CDN)                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTPS
                             │
┌────────────────────────────┴────────────────────────────────────┐
│                      Azure App Service                           │
│                    (Linux, Node.js 18+)                         │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Web App     │  │  Background  │  │   Admin      │         │
│  │  (Public)    │  │  Worker      │  │   Portal     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└──────┬────────────────┬─────────────────┬───────────────────────┘
       │                │                 │
       │                │                 │
       ├────────────────┴─────────────────┼─────────────────┐
       │                                  │                 │
       ▼                                  ▼                 ▼
┌─────────────┐                  ┌──────────────────┐ ┌──────────┐
│   Azure     │                  │  Azure Database  │ │  Azure   │
│   Cache     │                  │  for PostgreSQL  │ │  Blob    │
│   (Redis)   │                  │  Flexible Server │ │  Storage │
│             │                  │                  │ │          │
│ - Sessions  │                  │ - Users          │ │ - Images │
│ - Cache     │                  │ - Creatures      │ │ - Assets │
│ - Queues    │                  │ - Collections    │ │ - Backups│
└─────────────┘                  └──────────────────┘ └──────────┘
       │                                  │
       └──────────────┬───────────────────┘
                      │
                      ▼
              ┌───────────────┐
              │  Azure Key    │
              │  Vault        │
              │               │
              │ - DB Password │
              │ - OAuth Keys  │
              │ - API Keys    │
              └───────────────┘
                      │
                      ▼
              ┌───────────────┐
              │ Application   │
              │ Insights      │
              │               │
              │ - Monitoring  │
              │ - Logging     │
              │ - Alerts      │
              └───────────────┘
```

## Azure Services

### 1. Azure App Service (Web + API)

**Service:** App Service Plan (Linux, Premium V3)
**SKU:** P1V3 or P2V3 (production)

**Features:**
- Auto-scaling based on CPU/memory
- Deployment slots (staging/production)
- Built-in CI/CD integration
- HTTPS/SSL included
- Custom domain support
- WebSocket support for real-time features

**Configuration:**
- Runtime: Node.js 18 LTS or 20 LTS
- Always On: Enabled
- ARR Affinity: Disabled (stateless with Redis sessions)
- HTTP/2: Enabled
- Minimum TLS: 1.2

### 2. Azure Database for PostgreSQL - Flexible Server

**Service:** Azure Database for PostgreSQL Flexible Server
**SKU:** Burstable B2s (dev/test) or General Purpose D2s_v3 (production)

**Features:**
- Automatic backups (35 days retention)
- Point-in-time restore
- High availability option (zone-redundant)
- Automatic scaling
- Built-in monitoring

**Configuration:**
- PostgreSQL Version: 15 or 16
- Storage: 128 GB (auto-grow enabled)
- Backup retention: 35 days
- Compute: 2-4 vCores
- Firewall: Allow Azure services

**Performance Optimizations:**
```sql
-- Connection pooling settings
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 2621kB
min_wal_size = 1GB
max_wal_size = 4GB
```

### 3. Azure Cache for Redis

**Service:** Azure Cache for Redis
**SKU:** Standard C1 (dev) or Premium P1 (production)

**Use Cases:**
- **Session Storage**: Express session management
- **Response Caching**: API response caching
- **Rate Limiting**: API rate limiting
- **Queue Management**: Background job queues
- **Leaderboard**: Real-time rankings

**Configuration:**
```javascript
// Redis connection config
{
  host: process.env.REDIS_HOST,
  port: 6380,
  password: process.env.REDIS_KEY,
  tls: { servername: process.env.REDIS_HOST },
  db: 0,
  retryStrategy: (times) => Math.min(times * 50, 2000)
}
```

**Caching Strategy:**
```javascript
// Cache frequently accessed data
- User profiles: TTL 15 minutes
- Creature metadata: TTL 1 hour
- Collection stats: TTL 5 minutes
- YouTube video data: TTL 24 hours
- Leaderboards: TTL 1 minute
```

### 4. Azure Blob Storage

**Service:** Azure Blob Storage (Hot tier)
**Redundancy:** LRS (dev) or ZRS (production)

**Use Cases:**
- Static assets (PWA icons, images)
- Creature artwork
- User uploads
- Backup files
- Logs archive

**Configuration:**
- Access tier: Hot
- CDN integration: Enabled
- Lifecycle management: Move to Cool after 90 days
- Soft delete: 7 days retention

### 5. Azure Front Door

**Service:** Azure Front Door Standard/Premium
**Features:**
- Global load balancing
- CDN for static assets
- DDoS protection
- Web Application Firewall (WAF)
- SSL/TLS termination

**Rules:**
```yaml
# Caching rules
Static Assets (/assets/*, /user/components/*):
  - Cache duration: 365 days
  - Query string: Ignore all

API Endpoints (/api/*):
  - Cache: Disabled
  - Compression: Enabled

HTML Pages (*.html):
  - Cache duration: 1 hour
  - Compression: Enabled
```

### 6. Azure Key Vault

**Service:** Azure Key Vault (Standard tier)
**Purpose:** Secure secrets management

**Stored Secrets:**
- Database connection strings
- Google OAuth credentials
- YouTube API keys
- Session secrets
- Redis connection strings

**Access Policy:**
- App Service managed identity: GET, LIST
- Deployment pipelines: GET, LIST, SET
- Developers: None (use Azure CLI for emergency access)

### 7. Application Insights

**Service:** Application Insights
**Purpose:** APM and monitoring

**Monitoring:**
- Request/response times
- Database query performance
- Redis cache hit/miss ratio
- Exception tracking
- Custom events (creature collected, achievement unlocked)
- User flows

**Alerts:**
- Response time > 2 seconds
- Error rate > 5%
- Database CPU > 80%
- Redis memory > 80%
- App Service CPU > 80%

## Network Architecture

### Resource Group Structure

```
chatlings-prod-rg/
├── App Services
│   ├── chatlings-web-prod (main app)
│   └── chatlings-worker-prod (background jobs)
├── Database
│   └── chatlings-db-prod (PostgreSQL)
├── Cache
│   └── chatlings-redis-prod (Redis)
├── Storage
│   └── chatlingstorageprod (Blob Storage)
├── Networking
│   ├── chatlings-frontdoor-prod (Front Door)
│   └── chatlings-vnet-prod (Virtual Network)
├── Security
│   └── chatlings-kv-prod (Key Vault)
└── Monitoring
    └── chatlings-insights-prod (App Insights)
```

### Virtual Network (Optional for Premium)

**VNET Configuration:**
- Address space: 10.0.0.0/16
- App Service subnet: 10.0.1.0/24
- Database subnet: 10.0.2.0/24
- Redis subnet: 10.0.3.0/24

**Benefits:**
- Network isolation
- Private endpoints for database
- NSG for traffic control
- VPN/ExpressRoute integration

## Security

### 1. Authentication & Authorization

- **User Authentication**: Google OAuth 2.0
- **API Authentication**: Session-based (Redis-backed)
- **Admin Portal**: IP restriction + OAuth
- **Service-to-Service**: Managed Identity

### 2. Data Protection

- **Encryption at Rest**: Enabled on all services
- **Encryption in Transit**: TLS 1.2+ only
- **Database**: SSL required
- **Redis**: TLS enabled
- **Secrets**: Azure Key Vault only

### 3. Network Security

- **WAF Rules**: OWASP Top 10 protection
- **DDoS Protection**: Azure Front Door
- **IP Restrictions**: Admin endpoints
- **CORS**: Restricted origins only

### 4. Compliance

- **GDPR**: Data residency in EU (if needed)
- **Data Retention**: Automated lifecycle policies
- **Audit Logs**: 90 days retention
- **Backup**: Daily automated backups

## Scalability

### Auto-Scaling Configuration

**App Service:**
```yaml
Scale Out Rules:
  - CPU > 70% for 5 minutes → Add 1 instance
  - CPU < 30% for 10 minutes → Remove 1 instance
  - Min instances: 2
  - Max instances: 10

Scale Up Triggers:
  - Memory > 85% sustained → Upgrade tier
  - Response time > 3s sustained → Upgrade tier
```

**Database:**
```yaml
Scaling:
  - Auto-scale compute (if supported)
  - Storage auto-grow: Enabled
  - Read replicas: 1-2 for read-heavy queries
  - Connection pooling: 100 connections
```

**Redis:**
```yaml
Scaling:
  - Premium tier: Clustering enabled
  - Shard count: 3 (for > 100k users)
  - Persistence: RDB snapshots
```

## Performance Optimization

### 1. Caching Strategy

**Multi-Layer Caching:**
```
Browser Cache (1 year) → CDN (1 day) → Redis (1 hour) → Database
```

**Cache Keys:**
```
user:{userId}:profile
user:{userId}:collection
creature:{creatureId}:metadata
leaderboard:global:weekly
youtube:video:{videoId}:metadata
```

### 2. Database Optimization

**Indexes:**
```sql
-- User lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);

-- Collection queries
CREATE INDEX idx_collections_user_id ON user_collections(user_id);
CREATE INDEX idx_collections_creature_id ON user_collections(creature_id);

-- YouTube integration
CREATE INDEX idx_youtube_user_id ON youtube_likes(user_id);
CREATE INDEX idx_youtube_video_id ON youtube_likes(video_id);

-- Chatroom queries
CREATE INDEX idx_chatroom_active ON chatrooms(is_active, created_at);
```

**Connection Pooling:**
```javascript
const pool = new Pool({
  max: 20,
  min: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 3. Redis Optimization

**Memory Management:**
```redis
maxmemory-policy allkeys-lru
maxmemory 1gb
```

**Session Configuration:**
```javascript
const session = require('express-session');
const RedisStore = require('connect-redis').default;

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true, // HTTPS only
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'lax'
  }
}));
```

### 4. CDN Configuration

**Static Assets:**
- Cache all /assets/* for 1 year
- Cache /user/components/* for 1 day
- Compress: Gzip + Brotli
- Image optimization: WebP conversion

### 5. Application Performance

**Node.js Optimizations:**
```javascript
// Clustering for multi-core usage
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster && process.env.NODE_ENV === 'production') {
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
} else {
  // Start server
}
```

**Async Operations:**
```javascript
// Use async/await consistently
// Background jobs in separate worker
// Database query batching
// Parallel API calls where possible
```

## Cost Estimation (Monthly USD)

### Development Environment
- App Service (B1): $13
- PostgreSQL (Burstable B1ms): $12
- Redis (Basic C0): $16
- Blob Storage: $5
- **Total: ~$46/month**

### Production Environment (Small Scale)
- App Service (P1V3): $117
- PostgreSQL (General Purpose D2s_v3): $144
- Redis (Standard C1): $76
- Blob Storage + CDN: $20
- Front Door Standard: $35
- Key Vault: $3
- Application Insights: $10
- **Total: ~$405/month**

### Production Environment (Medium Scale)
- App Service (P2V3, 3 instances): $704
- PostgreSQL (General Purpose D4s_v3): $288
- Redis (Premium P1): $604
- Blob Storage + CDN: $50
- Front Door Premium: $320
- Key Vault: $3
- Application Insights: $50
- **Total: ~$2,019/month**

## Disaster Recovery

### Backup Strategy

**Database:**
- Automated daily backups (35 days)
- Point-in-time restore capability
- Geo-redundant backup storage (optional)

**Blob Storage:**
- GRS or RA-GRS replication
- Soft delete (7 days)
- Versioning enabled

**Redis:**
- RDB snapshots (Premium tier)
- Export to Blob Storage daily

### Recovery Objectives

- **RTO (Recovery Time Objective)**: 1 hour
- **RPO (Recovery Point Objective)**: 5 minutes
- **SLA Target**: 99.9% uptime

### Failover Plan

1. **Database Failure**: Restore from backup or failover to replica
2. **App Service Failure**: Auto-restart, multi-region deployment
3. **Redis Failure**: Rebuild from primary data (sessions lost)
4. **Region Failure**: Geo-failover (if configured)

## Monitoring & Alerting

### Key Metrics

**Application:**
- Request rate and duration
- Error rate (4xx, 5xx)
- Active sessions
- Background job queue length

**Database:**
- Connection count
- Query duration
- CPU and memory usage
- Storage utilization

**Redis:**
- Cache hit/miss ratio
- Memory usage
- Connected clients
- Evicted keys

### Alert Rules

```yaml
Critical Alerts (PagerDuty/SMS):
  - App Service down
  - Database unavailable
  - Error rate > 10%
  - Response time > 5s

Warning Alerts (Email):
  - CPU > 80% for 10 minutes
  - Memory > 85%
  - Storage > 80%
  - Cache hit ratio < 70%
```

## Deployment Regions

**Primary Regions (Recommended):**
- **US**: East US 2 (cheaper) or West US 2
- **EU**: North Europe or West Europe (GDPR compliance)
- **Global**: Multiple regions with Front Door

**Multi-Region Setup:**
```
Primary Region (Write):     East US 2
Read Replica Region:        West US 2
CDN:                        Global distribution
Front Door:                 Geo-routing
```

## Next Steps

1. Review architecture and adjust based on requirements
2. Set up Azure subscription and resource groups
3. Run Bicep deployment scripts
4. Configure secrets in Key Vault
5. Set up CI/CD pipeline
6. Deploy application
7. Configure monitoring and alerts
8. Perform load testing
9. Set up backup and disaster recovery
10. Document runbooks for operations

## Additional Resources

- [Azure App Service Documentation](https://docs.microsoft.com/azure/app-service/)
- [Azure Database for PostgreSQL](https://docs.microsoft.com/azure/postgresql/)
- [Azure Cache for Redis](https://docs.microsoft.com/azure/azure-cache-for-redis/)
- [Azure Front Door](https://docs.microsoft.com/azure/frontdoor/)
- [Azure Best Practices](https://docs.microsoft.com/azure/architecture/best-practices/)
