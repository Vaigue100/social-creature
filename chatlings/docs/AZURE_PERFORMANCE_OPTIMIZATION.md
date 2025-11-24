# Chatlings Azure Performance Optimization Guide

## Overview

This guide provides detailed performance optimization strategies for running Chatlings on Azure with maximum efficiency and minimal cost.

## Table of Contents

1. [Redis Caching Strategy](#redis-caching-strategy)
2. [Database Optimization](#database-optimization)
3. [Application Performance](#application-performance)
4. [CDN and Static Assets](#cdn-and-static-assets)
5. [Monitoring and Tuning](#monitoring-and-tuning)

---

## Redis Caching Strategy

### 1. Session Management

**Current (Without Redis):**
- Sessions stored in memory
- Lost on app restart
- Not shared across instances

**Optimized (With Redis):**
```javascript
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const { getClient } = require('./config/redis');

// Initialize Redis session store
const redisClient = await getClient();

app.use(session({
  store: new RedisStore({
    client: redisClient,
    prefix: 'sess:'
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'lax'
  }
}));
```

**Benefits:**
- Persistent sessions across restarts
- Shared sessions across multiple instances
- Automatic session cleanup
- ~100x faster than database sessions

### 2. Data Caching

**Implementation:**

```javascript
const { getCache } = require('./config/redis');

// Cache user profile
async function getUserProfile(userId) {
  const cache = await getCache();
  const cacheKey = `user:${userId}:profile`;

  // Try cache first
  let profile = await cache.get(cacheKey);

  if (!profile) {
    // Cache miss - fetch from database
    profile = await db.query('SELECT * FROM users WHERE id = $1', [userId]);

    // Store in cache for 15 minutes
    await cache.set(cacheKey, profile, 900);
  }

  return profile;
}

// Cache user collections
async function getUserCollections(userId) {
  const cache = await getCache();
  const cacheKey = `user:${userId}:collections`;

  let collections = await cache.get(cacheKey);

  if (!collections) {
    collections = await db.query(`
      SELECT c.*, cr.name, cr.rarity
      FROM user_collections c
      JOIN creatures cr ON c.creature_id = cr.id
      WHERE c.user_id = $1
      ORDER BY c.acquired_at DESC
    `, [userId]);

    // Cache for 5 minutes
    await cache.set(cacheKey, collections, 300);
  }

  return collections;
}

// Invalidate cache when data changes
async function addCreatureToCollection(userId, creatureId) {
  const result = await db.query(/* insert query */);

  const cache = await getCache();
  // Clear user's collection cache
  await cache.del(`user:${userId}:collections`);

  return result;
}
```

### 3. YouTube API Response Caching

```javascript
async function getYouTubeVideoMetadata(videoId) {
  const cache = await getCache();
  const cacheKey = `youtube:video:${videoId}`;

  let metadata = await cache.get(cacheKey);

  if (!metadata) {
    // Fetch from YouTube API
    metadata = await youtube.videos.list({
      part: 'snippet,statistics',
      id: videoId
    });

    // Cache for 24 hours (video metadata rarely changes)
    await cache.set(cacheKey, metadata, 86400);
  }

  return metadata;
}
```

### 4. Leaderboard Caching

```javascript
// Use Redis sorted sets for leaderboards
async function updateLeaderboard(userId, score) {
  const cache = await getCache();
  await cache.zadd('leaderboard:global', score, userId);
}

async function getTopPlayers(limit = 10) {
  const cache = await getCache();
  return await cache.zrevrange('leaderboard:global', 0, limit - 1, true);
}
```

### 5. Rate Limiting

```javascript
async function checkRateLimit(userId, action, limit = 10, window = 60) {
  const cache = await getCache();
  const key = `ratelimit:${userId}:${action}`;

  const current = await cache.incr(key, window);

  if (current > limit) {
    throw new Error('Rate limit exceeded');
  }

  return true;
}

// Usage
app.post('/api/collect-creature', async (req, res) => {
  try {
    await checkRateLimit(req.user.id, 'collect', 10, 60); // 10 per minute
    // ... rest of handler
  } catch (error) {
    res.status(429).json({ error: 'Too many requests' });
  }
});
```

### Cache Key Strategy

```javascript
// Organized cache keys
const CACHE_KEYS = {
  USER_PROFILE: (userId) => `user:${userId}:profile`,
  USER_COLLECTIONS: (userId) => `user:${userId}:collections`,
  USER_ACHIEVEMENTS: (userId) => `user:${userId}:achievements`,
  CREATURE_META: (creatureId) => `creature:${creatureId}:meta`,
  YOUTUBE_VIDEO: (videoId) => `youtube:video:${videoId}`,
  YOUTUBE_CHANNEL: (channelId) => `youtube:channel:${channelId}`,
  LEADERBOARD_GLOBAL: 'leaderboard:global',
  LEADERBOARD_WEEKLY: 'leaderboard:weekly',
  STATS_GLOBAL: 'stats:global'
};

// TTL configuration (in seconds)
const CACHE_TTL = {
  USER_PROFILE: 900,      // 15 minutes
  USER_COLLECTIONS: 300,  // 5 minutes
  USER_ACHIEVEMENTS: 600, // 10 minutes
  CREATURE_META: 3600,    // 1 hour
  YOUTUBE_VIDEO: 86400,   // 24 hours
  LEADERBOARD: 60,        // 1 minute
  STATS: 300              // 5 minutes
};
```

---

## Database Optimization

### 1. Connection Pooling

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,

  // Connection pool settings
  max: 20,                    // Maximum pool size
  min: 5,                     // Minimum pool size
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Fail fast on connection errors

  // Query timeout
  query_timeout: 10000,       // 10 second query timeout

  // Statement timeout (server-side)
  statement_timeout: 10000    // 10 second statement timeout
});

// Monitor pool health
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

pool.on('connect', (client) => {
  console.log('New client connected to pool');
});

pool.on('remove', (client) => {
  console.log('Client removed from pool');
});
```

### 2. Essential Indexes

```sql
-- User lookups (most common queries)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Collection queries
CREATE INDEX IF NOT EXISTS idx_user_collections_user_id ON user_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_collections_creature_id ON user_collections(creature_id);
CREATE INDEX IF NOT EXISTS idx_user_collections_acquired_at ON user_collections(acquired_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_collections_user_creature ON user_collections(user_id, creature_id);

-- YouTube integration
CREATE INDEX IF NOT EXISTS idx_youtube_tokens_user_id ON youtube_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_youtube_likes_user_id ON youtube_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_youtube_likes_video_id ON youtube_likes(video_id);
CREATE INDEX IF NOT EXISTS idx_youtube_likes_user_video ON youtube_likes(user_id, video_id);

-- Achievements
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked_at ON user_achievements(unlocked_at DESC);

-- Chatrooms
CREATE INDEX IF NOT EXISTS idx_chatrooms_active ON chatrooms(is_active, created_at DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_chatroom_messages_room_id ON chatroom_messages(chatroom_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chatroom_participants_room_id ON chatroom_participants(chatroom_id);
CREATE INDEX IF NOT EXISTS idx_chatroom_participants_user_id ON chatroom_participants(user_id);

-- Partial indexes for common filters
CREATE INDEX IF NOT EXISTS idx_collections_rare ON user_collections(user_id)
WHERE creature_id IN (SELECT id FROM creatures WHERE rarity IN ('legendary', 'mythic'));
```

### 3. Query Optimization

**Bad Query (N+1 Problem):**
```javascript
// DON'T DO THIS
const users = await db.query('SELECT * FROM users');
for (const user of users.rows) {
  const collections = await db.query(
    'SELECT * FROM user_collections WHERE user_id = $1',
    [user.id]
  );
  user.collections = collections.rows;
}
```

**Good Query (JOIN):**
```javascript
// DO THIS INSTEAD
const result = await db.query(`
  SELECT
    u.*,
    json_agg(
      json_build_object(
        'id', uc.id,
        'creature_id', uc.creature_id,
        'acquired_at', uc.acquired_at
      )
    ) as collections
  FROM users u
  LEFT JOIN user_collections uc ON u.id = uc.user_id
  GROUP BY u.id
`);
```

**Batch Inserts:**
```javascript
// Bad: Individual inserts
for (const creature of creatures) {
  await db.query(
    'INSERT INTO creatures (name, rarity) VALUES ($1, $2)',
    [creature.name, creature.rarity]
  );
}

// Good: Batch insert
const values = creatures.map(c => `('${c.name}', '${c.rarity}')`).join(',');
await db.query(`
  INSERT INTO creatures (name, rarity)
  VALUES ${values}
`);

// Better: Parameterized batch insert
const values = [];
const params = [];
creatures.forEach((c, i) => {
  const offset = i * 2;
  values.push(`($${offset + 1}, $${offset + 2})`);
  params.push(c.name, c.rarity);
});

await db.query(
  `INSERT INTO creatures (name, rarity) VALUES ${values.join(',')}`,
  params
);
```

### 4. Database Configuration

In Azure PostgreSQL Flexible Server, configure these parameters:

```ini
# Connection settings
max_connections = 100
superuser_reserved_connections = 3

# Memory settings
shared_buffers = 256MB           # 25% of RAM
effective_cache_size = 1GB       # 50-75% of RAM
maintenance_work_mem = 64MB
work_mem = 2621kB                # RAM / max_connections / 16

# Checkpoint settings
checkpoint_completion_target = 0.9
wal_buffers = 16MB
min_wal_size = 1GB
max_wal_size = 4GB

# Query planning
default_statistics_target = 100
random_page_cost = 1.1           # For SSD storage
effective_io_concurrency = 200   # For SSD storage

# Logging
log_min_duration_statement = 1000  # Log queries > 1 second
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on

# Autovacuum (important!)
autovacuum = on
autovacuum_max_workers = 3
autovacuum_naptime = 30s
```

---

## Application Performance

### 1. Enable Compression

```javascript
const compression = require('compression');

app.use(compression({
  level: 6,              // Compression level (0-9)
  threshold: 1024,       // Only compress responses > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));
```

### 2. Response Caching Middleware

```javascript
function cacheMiddleware(ttl = 300) {
  return async (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    const cache = await getCache();
    const cacheKey = `http:${req.originalUrl}`;

    const cached = await cache.get(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }

    // Override res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = async (data) => {
      await cache.set(cacheKey, data, ttl);
      res.set('X-Cache', 'MISS');
      return originalJson(data);
    };

    next();
  };
}

// Usage
app.get('/api/leaderboard', cacheMiddleware(60), async (req, res) => {
  // This response will be cached for 60 seconds
  const leaderboard = await getLeaderboard();
  res.json(leaderboard);
});
```

### 3. Async/Parallel Processing

```javascript
// Bad: Sequential
async function getUserDashboard(userId) {
  const profile = await getUserProfile(userId);
  const collections = await getUserCollections(userId);
  const achievements = await getUserAchievements(userId);
  const stats = await getUserStats(userId);

  return { profile, collections, achievements, stats };
}

// Good: Parallel
async function getUserDashboard(userId) {
  const [profile, collections, achievements, stats] = await Promise.all([
    getUserProfile(userId),
    getUserCollections(userId),
    getUserAchievements(userId),
    getUserStats(userId)
  ]);

  return { profile, collections, achievements, stats };
}
```

### 4. Background Jobs

```javascript
const Queue = require('bull');
const { getClient } = require('./config/redis');

// Create queue using Redis
const redisClient = await getClient();
const creatureQueue = new Queue('creatures', {
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_KEY,
    tls: process.env.NODE_ENV === 'production' ? {} : undefined
  }
});

// Producer: Add jobs to queue
app.post('/api/process-youtube-likes', async (req, res) => {
  await creatureQueue.add('fetch-likes', {
    userId: req.user.id
  });

  res.json({ status: 'processing' });
});

// Consumer: Process jobs
creatureQueue.process('fetch-likes', async (job) => {
  const { userId } = job.data;
  await processYouTubeLikes(userId);
});
```

---

## CDN and Static Assets

### 1. Azure CDN Configuration

```javascript
// Serve static assets from Blob Storage + CDN
const CDN_ENDPOINT = process.env.CDN_ENDPOINT || '';

function getCDNUrl(path) {
  if (CDN_ENDPOINT) {
    return `${CDN_ENDPOINT}/${path}`;
  }
  return `/assets/${path}`;
}

// In templates
app.locals.cdnUrl = getCDNUrl;
```

### 2. Image Optimization

```javascript
const sharp = require('sharp');

async function optimizeImage(buffer, options = {}) {
  return sharp(buffer)
    .resize(options.width, options.height, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .webp({ quality: 80 })
    .toBuffer();
}

// Serve optimized images
app.get('/assets/creatures/:id.webp', async (req, res) => {
  const cache = await getCache();
  const cacheKey = `image:creature:${req.params.id}:webp`;

  let image = await cache.get(cacheKey);

  if (!image) {
    const original = await getCreatureImage(req.params.id);
    image = await optimizeImage(original, { width: 512, height: 512 });
    await cache.set(cacheKey, image.toString('base64'), 86400);
  } else {
    image = Buffer.from(image, 'base64');
  }

  res.type('image/webp');
  res.send(image);
});
```

### 3. HTTP Caching Headers

```javascript
app.use('/assets', express.static('public/assets', {
  maxAge: '365d',
  immutable: true,
  etag: true
}));

app.use('/user/components', express.static('user/components', {
  maxAge: '1d',
  etag: true
}));
```

---

## Monitoring and Tuning

### 1. Application Insights Custom Metrics

```javascript
const appInsights = require('applicationinsights');

if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
  appInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING)
    .setAutoDependencyCorrelation(true)
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectConsole(true)
    .start();
}

const client = appInsights.defaultClient;

// Track custom events
function trackCreatureCollected(userId, creatureId, rarity) {
  client.trackEvent({
    name: 'CreatureCollected',
    properties: {
      userId,
      creatureId,
      rarity
    }
  });
}

// Track custom metrics
function trackCachePerformance(hit, duration) {
  client.trackMetric({
    name: 'CacheHitRate',
    value: hit ? 1 : 0
  });

  client.trackMetric({
    name: 'CacheResponseTime',
    value: duration
  });
}

// Usage
app.get('/api/creature/:id', async (req, res) => {
  const start = Date.now();
  const cached = await cache.get(`creature:${req.params.id}`);
  const duration = Date.now() - start;

  trackCachePerformance(!!cached, duration);

  if (cached) {
    return res.json(cached);
  }

  // Fetch from DB...
});
```

### 2. Health Check Endpoint

```javascript
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {}
  };

  try {
    // Check database
    await pool.query('SELECT 1');
    health.checks.database = 'ok';
  } catch (error) {
    health.status = 'unhealthy';
    health.checks.database = 'error';
  }

  try {
    // Check Redis
    const cache = await getCache();
    await cache.set('health_check', '1', 10);
    health.checks.redis = 'ok';
  } catch (error) {
    health.status = 'degraded';
    health.checks.redis = 'error';
  }

  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});
```

### 3. Performance Metrics Dashboard

Create a dashboard in Azure Monitor with these metrics:

**Application:**
- Request rate (requests/sec)
- Response time (avg, p95, p99)
- Error rate (4xx, 5xx)
- Active instances

**Database:**
- Connection count
- Query duration (avg, p95, p99)
- CPU percentage
- Storage used

**Redis:**
- Hit rate percentage
- Memory usage
- Connected clients
- Commands/sec

**Key Alerts:**
- Response time > 2s for 5 minutes
- Error rate > 5% for 2 minutes
- Database CPU > 80% for 10 minutes
- Redis memory > 80%

---

## Performance Checklist

### Pre-deployment:
- [ ] Redis caching implemented for hot data paths
- [ ] Database indexes created for all common queries
- [ ] Connection pooling configured
- [ ] Compression enabled
- [ ] Static assets moved to CDN
- [ ] Images optimized (WebP, proper sizing)
- [ ] Background jobs using queue system
- [ ] Health check endpoint implemented

### Post-deployment:
- [ ] Monitor cache hit rates (target: >80%)
- [ ] Monitor database query performance
- [ ] Set up performance alerts
- [ ] Load test critical endpoints
- [ ] Review slow query logs
- [ ] Optimize based on real traffic patterns
- [ ] Configure auto-scaling rules

### Ongoing:
- [ ] Weekly performance review
- [ ] Monthly database maintenance (VACUUM, ANALYZE)
- [ ] Quarterly architecture review
- [ ] Monitor and adjust cache TTLs
- [ ] Review and optimize Redis memory usage
- [ ] Update indexes based on query patterns

---

## Expected Performance Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| User Profile Load | 200ms | 15ms | 93% faster |
| Collection Page | 500ms | 50ms | 90% faster |
| Leaderboard | 300ms | 10ms | 97% faster |
| Session Lookup | 50ms | 2ms | 96% faster |
| YouTube API Calls | 100% | 5% | 95% reduction |
| Database Queries | 1000/min | 200/min | 80% reduction |
| Cache Hit Rate | 0% | 85% | N/A |
| Server Response Time | 250ms avg | 50ms avg | 80% faster |

---

## Cost Optimization

Implementing these optimizations will also reduce costs:

1. **Redis caching** reduces database compute costs by 60-70%
2. **CDN** reduces App Service bandwidth costs by 80%
3. **Connection pooling** allows smaller database tier
4. **Background jobs** prevent API rate limit overages
5. **Auto-scaling** reduces over-provisioning costs

**Estimated Monthly Savings:** $100-300 depending on scale
