// Redis Configuration for Azure Cache for Redis
const redis = require('redis');

// Redis client configuration
const redisConfig = {
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT || 6380,
    tls: process.env.NODE_ENV === 'production' ? true : false,
    servername: process.env.REDIS_HOST
  },
  password: process.env.REDIS_KEY || process.env.REDIS_PASSWORD,
  database: 0,
  retry_strategy: function(options) {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      console.error('Redis connection refused');
      return new Error('The server refused the connection');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      console.error('Redis retry time exhausted');
      return new Error('Retry time exhausted');
    }
    if (options.attempt > 10) {
      console.error('Redis max retry attempts reached');
      return undefined;
    }
    // Reconnect after
    return Math.min(options.attempt * 100, 3000);
  }
};

// Create Redis client
let redisClient = null;

async function createRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  try {
    redisClient = redis.createClient(redisConfig);

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('✓ Redis client connected');
    });

    redisClient.on('ready', () => {
      console.log('✓ Redis client ready');
    });

    redisClient.on('reconnecting', () => {
      console.log('⟳ Redis client reconnecting...');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.error('Failed to create Redis client:', error);
    throw error;
  }
}

// Cache helper functions
class CacheManager {
  constructor(client) {
    this.client = client;
  }

  // Get cached value
  async get(key) {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  // Set cached value with TTL (in seconds)
  async set(key, value, ttl = 3600) {
    try {
      await this.client.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  // Delete cached value
  async del(key) {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  // Delete multiple keys by pattern
  async delPattern(pattern) {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return true;
    } catch (error) {
      console.error(`Cache delete pattern error for ${pattern}:`, error);
      return false;
    }
  }

  // Check if key exists
  async exists(key) {
    try {
      return await this.client.exists(key);
    } catch (error) {
      console.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  // Increment counter
  async incr(key, ttl = null) {
    try {
      const value = await this.client.incr(key);
      if (ttl && value === 1) {
        await this.client.expire(key, ttl);
      }
      return value;
    } catch (error) {
      console.error(`Cache incr error for key ${key}:`, error);
      return null;
    }
  }

  // Get multiple keys
  async mget(keys) {
    try {
      const values = await this.client.mGet(keys);
      return values.map(v => v ? JSON.parse(v) : null);
    } catch (error) {
      console.error(`Cache mget error:`, error);
      return keys.map(() => null);
    }
  }

  // Hash operations
  async hset(key, field, value) {
    try {
      await this.client.hSet(key, field, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Cache hset error for key ${key}:`, error);
      return false;
    }
  }

  async hget(key, field) {
    try {
      const value = await this.client.hGet(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Cache hget error for key ${key}:`, error);
      return null;
    }
  }

  async hgetall(key) {
    try {
      const hash = await this.client.hGetAll(key);
      const result = {};
      for (const [field, value] of Object.entries(hash)) {
        result[field] = JSON.parse(value);
      }
      return result;
    } catch (error) {
      console.error(`Cache hgetall error for key ${key}:`, error);
      return {};
    }
  }

  // Leaderboard operations (sorted sets)
  async zadd(key, score, member) {
    try {
      await this.client.zAdd(key, { score, value: member });
      return true;
    } catch (error) {
      console.error(`Cache zadd error for key ${key}:`, error);
      return false;
    }
  }

  async zrange(key, start, stop, withScores = false) {
    try {
      if (withScores) {
        return await this.client.zRangeWithScores(key, start, stop);
      }
      return await this.client.zRange(key, start, stop);
    } catch (error) {
      console.error(`Cache zrange error for key ${key}:`, error);
      return [];
    }
  }

  async zrevrange(key, start, stop, withScores = false) {
    try {
      if (withScores) {
        return await this.client.zRangeWithScores(key, start, stop, { REV: true });
      }
      return await this.client.zRange(key, start, stop, { REV: true });
    } catch (error) {
      console.error(`Cache zrevrange error for key ${key}:`, error);
      return [];
    }
  }

  // Get cache stats
  async getStats() {
    try {
      const info = await this.client.info('stats');
      return info;
    } catch (error) {
      console.error('Cache stats error:', error);
      return null;
    }
  }
}

// Export
module.exports = {
  createRedisClient,
  CacheManager,
  getClient: async () => {
    if (!redisClient) {
      await createRedisClient();
    }
    return redisClient;
  },
  getCache: async () => {
    const client = await module.exports.getClient();
    return new CacheManager(client);
  }
};
