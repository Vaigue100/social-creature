/**
 * Animation Service
 * Retrieves and manages creature animations for display
 */

const { Client } = require('pg');

class AnimationService {
  constructor(dbConfig) {
    this.dbConfig = dbConfig;
  }

  /**
   * Get all animations for a specific creature
   * @param {string} creatureId - The creature UUID
   * @returns {Array} Array of animation objects grouped by type
   */
  async getCreatureAnimations(creatureId) {
    const client = new Client(this.dbConfig);

    try {
      await client.connect();

      const result = await client.query(`
        SELECT
          ca.id,
          ca.animation_type,
          ca.file_path,
          ca.file_name,
          ca.display_name,
          ca.duration_seconds,
          at.display_name as type_display_name,
          at.is_random_selection
        FROM creature_animations ca
        JOIN animation_types at ON ca.animation_type = at.type_key
        WHERE ca.creature_id = $1
          AND ca.is_active = true
        ORDER BY ca.animation_type, ca.created_at DESC
      `, [creatureId]);

      // Group animations by type
      const grouped = {};
      for (const row of result.rows) {
        if (!grouped[row.animation_type]) {
          grouped[row.animation_type] = {
            type_key: row.animation_type,
            type_name: row.type_display_name,
            is_random: row.is_random_selection,
            animations: []
          };
        }

        grouped[row.animation_type].animations.push({
          id: row.id,
          file_path: row.file_path,
          file_name: row.file_name,
          display_name: row.display_name,
          duration_seconds: row.duration_seconds
        });
      }

      return grouped;

    } finally {
      await client.end();
    }
  }

  /**
   * Get a random animation of a specific type for a creature
   * @param {string} creatureId - The creature UUID
   * @param {string} animationType - The animation type (pose, idle, happy, etc.)
   * @returns {Object|null} A random animation of that type, or null if none exist
   */
  async getRandomAnimation(creatureId, animationType) {
    const client = new Client(this.dbConfig);

    try {
      await client.connect();

      const result = await client.query(`
        SELECT
          ca.id,
          ca.animation_type,
          ca.file_path,
          ca.file_name,
          ca.display_name,
          ca.duration_seconds
        FROM creature_animations ca
        WHERE ca.creature_id = $1
          AND ca.animation_type = $2
          AND ca.is_active = true
        ORDER BY RANDOM()
        LIMIT 1
      `, [creatureId, animationType]);

      return result.rows.length > 0 ? result.rows[0] : null;

    } finally {
      await client.end();
    }
  }

  /**
   * Get a specific animation by type (for non-random types like 'leaving', 'arriving')
   * Returns the first/most recent one if multiple exist
   * @param {string} creatureId - The creature UUID
   * @param {string} animationType - The animation type
   * @returns {Object|null} The animation, or null if none exist
   */
  async getSpecificAnimation(creatureId, animationType) {
    const client = new Client(this.dbConfig);

    try {
      await client.connect();

      const result = await client.query(`
        SELECT
          ca.id,
          ca.animation_type,
          ca.file_path,
          ca.file_name,
          ca.display_name,
          ca.duration_seconds
        FROM creature_animations ca
        WHERE ca.creature_id = $1
          AND ca.animation_type = $2
          AND ca.is_active = true
        ORDER BY ca.created_at DESC
        LIMIT 1
      `, [creatureId, animationType]);

      return result.rows.length > 0 ? result.rows[0] : null;

    } finally {
      await client.end();
    }
  }

  /**
   * Get animation for display based on type configuration
   * Automatically handles random vs specific selection based on animation type settings
   * @param {string} creatureId - The creature UUID
   * @param {string} animationType - The animation type
   * @returns {Object|null} The selected animation
   */
  async getAnimationForDisplay(creatureId, animationType) {
    const client = new Client(this.dbConfig);

    try {
      await client.connect();

      // Check if this type uses random selection
      const typeInfo = await client.query(`
        SELECT is_random_selection
        FROM animation_types
        WHERE type_key = $1
      `, [animationType]);

      if (typeInfo.rows.length === 0) {
        console.warn(`Animation type not found: ${animationType}`);
        return null;
      }

      const isRandom = typeInfo.rows[0].is_random_selection;

      // Get animation based on type's selection method
      const result = await client.query(`
        SELECT
          ca.id,
          ca.animation_type,
          ca.file_path,
          ca.file_name,
          ca.display_name,
          ca.duration_seconds
        FROM creature_animations ca
        WHERE ca.creature_id = $1
          AND ca.animation_type = $2
          AND ca.is_active = true
        ORDER BY ${isRandom ? 'RANDOM()' : 'ca.created_at DESC'}
        LIMIT 1
      `, [creatureId, animationType]);

      return result.rows.length > 0 ? result.rows[0] : null;

    } finally {
      await client.end();
    }
  }

  /**
   * Check if a creature has any animations of a specific type
   * @param {string} creatureId - The creature UUID
   * @param {string} animationType - The animation type
   * @returns {boolean} True if animations exist
   */
  async hasAnimations(creatureId, animationType) {
    const client = new Client(this.dbConfig);

    try {
      await client.connect();

      const result = await client.query(`
        SELECT COUNT(*) as count
        FROM creature_animations
        WHERE creature_id = $1
          AND animation_type = $2
          AND is_active = true
      `, [creatureId, animationType]);

      return parseInt(result.rows[0].count) > 0;

    } finally {
      await client.end();
    }
  }

  /**
   * Get all animation types
   * @returns {Array} Array of animation type definitions
   */
  async getAnimationTypes() {
    const client = new Client(this.dbConfig);

    try {
      await client.connect();

      const result = await client.query(`
        SELECT
          type_key,
          display_name,
          description,
          is_random_selection,
          display_order
        FROM animation_types
        ORDER BY display_order
      `);

      return result.rows;

    } finally {
      await client.end();
    }
  }
}

module.exports = AnimationService;
