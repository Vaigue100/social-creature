/**
 * Chatlings Backend Server
 * Main entry point for the Chatlings API
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const db = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Security headers
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://yourdomain.com']
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Compression
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// ============================================================================
// ROUTES
// ============================================================================

// Health check
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    await db.query('SELECT 1');
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});

// API Info
app.get('/api', (req, res) => {
  res.json({
    name: 'Chatlings API',
    version: '1.0.0',
    description: 'Social Media Collecting Game Backend',
    endpoints: {
      health: '/health',
      creatures: '/api/creatures',
      users: '/api/users',
      encounters: '/api/encounters',
      lore: '/api/lore'
    }
  });
});

// Creatures routes
app.get('/api/creatures', async (req, res) => {
  try {
    const { rarity, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT
        c.id,
        c.creature_name,
        c.rarity_tier,
        ds.species_name,
        dss.subspecies_name,
        dc.colouring_name,
        dst.style_name,
        dm.mood_name,
        dmt.motion_name,
        dea.affinity_name as elemental_affinity,
        de.environment_name
      FROM creatures c
      LEFT JOIN dim_species ds ON c.species_id = ds.id
      LEFT JOIN dim_subspecies dss ON c.subspecies_id = dss.id
      LEFT JOIN dim_colouring dc ON c.colouring_id = dc.id
      LEFT JOIN dim_style dst ON c.style_id = dst.id
      LEFT JOIN dim_mood dm ON c.mood_id = dm.id
      LEFT JOIN dim_motion_type dmt ON c.motion_type_id = dmt.id
      LEFT JOIN dim_elemental_affinity dea ON c.elemental_affinity_id = dea.id
      LEFT JOIN dim_environment de ON c.environment_id = de.id
      WHERE c.is_active = true
    `;

    const params = [];

    if (rarity) {
      query += ' AND c.rarity_tier = $1';
      params.push(rarity);
      query += ` LIMIT $2 OFFSET $3`;
      params.push(limit, offset);
    } else {
      query += ` LIMIT $1 OFFSET $2`;
      params.push(limit, offset);
    }

    const result = await db.query(query, params);

    res.json({
      count: result.rows.length,
      creatures: result.rows
    });
  } catch (error) {
    console.error('Error fetching creatures:', error);
    res.status(500).json({ error: 'Failed to fetch creatures' });
  }
});

// Get specific creature
app.get('/api/creatures/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT
        c.*,
        ds.species_name,
        ds.category,
        dss.subspecies_name,
        dc.colouring_name,
        dst.style_name,
        dm.mood_name,
        dmt.motion_name,
        dea.affinity_name as elemental_affinity,
        de.environment_name
      FROM creatures c
      LEFT JOIN dim_species ds ON c.species_id = ds.id
      LEFT JOIN dim_subspecies dss ON c.subspecies_id = dss.id
      LEFT JOIN dim_colouring dc ON c.colouring_id = dc.id
      LEFT JOIN dim_style dst ON c.style_id = dst.id
      LEFT JOIN dim_mood dm ON c.mood_id = dm.id
      LEFT JOIN dim_motion_type dmt ON c.motion_type_id = dmt.id
      LEFT JOIN dim_elemental_affinity dea ON c.elemental_affinity_id = dea.id
      LEFT JOIN dim_environment de ON c.environment_id = de.id
      WHERE c.id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Creature not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching creature:', error);
    res.status(500).json({ error: 'Failed to fetch creature' });
  }
});

// Get game lore
app.get('/api/lore/game', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM lore_game
      ORDER BY sort_order ASC
    `);

    res.json({
      count: result.rows.length,
      lore: result.rows
    });
  } catch (error) {
    console.error('Error fetching lore:', error);
    res.status(500).json({ error: 'Failed to fetch lore' });
  }
});

// Get species lore
app.get('/api/lore/species/:speciesId', async (req, res) => {
  try {
    const { speciesId } = req.params;

    const result = await db.query(`
      SELECT ls.*, ds.species_name
      FROM lore_species ls
      JOIN dim_species ds ON ls.species_id = ds.id
      WHERE ls.species_id = $1
      ORDER BY ls.sort_order ASC
    `, [speciesId]);

    res.json({
      count: result.rows.length,
      lore: result.rows
    });
  } catch (error) {
    console.error('Error fetching species lore:', error);
    res.status(500).json({ error: 'Failed to fetch species lore' });
  }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

app.listen(PORT, () => {
  console.log('========================================');
  console.log('🎮 Chatlings API Server');
  console.log('========================================');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log('========================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  db.pool.end(() => {
    console.log('Database pool closed');
    process.exit(0);
  });
});
