/**
 * Trait Generation System
 * Generates social trait scores based on body type personality and rarity tier
 */

/**
 * Body type trait tendencies
 * Each body type has base scores for each trait category
 * Scores range from 30-70, will be randomized ±20 and scaled by rarity
 */
const BODY_TYPE_TRAITS = {
  // Cute body types (1-9)
  'Cute': {
    friendliness: 70, playfulness: 70, creativity: 55, empathy: 65,
    energy: 60, confidence: 50, humor: 60, curiosity: 55
  },
  'Nerdy': {
    friendliness: 50, playfulness: 45, creativity: 70, empathy: 55,
    energy: 40, confidence: 45, humor: 50, curiosity: 80
  },
  'Sporty': {
    friendliness: 60, playfulness: 75, creativity: 45, empathy: 50,
    energy: 85, confidence: 70, humor: 60, curiosity: 50
  },
  'Artsy': {
    friendliness: 55, playfulness: 60, creativity: 90, empathy: 70,
    energy: 50, confidence: 55, humor: 55, curiosity: 75
  },
  'Chill': {
    friendliness: 75, playfulness: 40, creativity: 50, empathy: 80,
    energy: 30, confidence: 60, humor: 50, curiosity: 45
  },
  'Rebel': {
    friendliness: 45, playfulness: 65, creativity: 70, empathy: 40,
    energy: 75, confidence: 80, humor: 65, curiosity: 70
  },
  'Athlete': {
    friendliness: 65, playfulness: 70, creativity: 40, empathy: 55,
    energy: 90, confidence: 75, humor: 60, curiosity: 50
  },
  'Scholar': {
    friendliness: 50, playfulness: 35, creativity: 75, empathy: 60,
    energy: 45, confidence: 50, humor: 45, curiosity: 85
  },
  'Social': {
    friendliness: 85, playfulness: 75, creativity: 60, empathy: 75,
    energy: 70, confidence: 70, humor: 80, curiosity: 65
  },

  // Special body types (10+)
  'Zombie': {
    friendliness: 40, playfulness: 50, creativity: 55, empathy: 45,
    energy: 35, confidence: 50, humor: 70, curiosity: 60
  },
  'Gothic': {
    friendliness: 45, playfulness: 40, creativity: 80, empathy: 65,
    energy: 50, confidence: 65, humor: 55, curiosity: 75
  },
  'Knight': {
    friendliness: 60, playfulness: 45, creativity: 40, empathy: 70,
    energy: 65, confidence: 85, humor: 50, curiosity: 50
  },
  'Guardian': {
    friendliness: 55, playfulness: 40, creativity: 35, empathy: 75,
    energy: 60, confidence: 80, humor: 45, curiosity: 45
  },
  'Ranger': {
    friendliness: 50, playfulness: 60, creativity: 55, empathy: 55,
    energy: 75, confidence: 70, humor: 55, curiosity: 80
  },
  'Mage': {
    friendliness: 45, playfulness: 50, creativity: 90, empathy: 60,
    energy: 55, confidence: 60, humor: 50, curiosity: 85
  },
  'Dragon': {
    friendliness: 40, playfulness: 55, creativity: 65, empathy: 45,
    energy: 70, confidence: 90, humor: 55, curiosity: 70
  },
  'Beast': {
    friendliness: 35, playfulness: 75, creativity: 45, empathy: 40,
    energy: 85, confidence: 75, humor: 60, curiosity: 65
  },
  'Mech': {
    friendliness: 40, playfulness: 50, creativity: 70, empathy: 35,
    energy: 60, confidence: 70, humor: 45, curiosity: 75
  },
  'Spirit': {
    friendliness: 65, playfulness: 55, creativity: 80, empathy: 85,
    energy: 45, confidence: 55, humor: 60, curiosity: 80
  }
};

/**
 * Rarity multipliers - affects trait variance and quality
 */
const RARITY_CONFIG = {
  'Common': { baseBonus: 0, variance: 15 },
  'Uncommon': { baseBonus: 5, variance: 18 },
  'Rare': { baseBonus: 10, variance: 20 },
  'Epic': { baseBonus: 15, variance: 22 },
  'Legendary': { baseBonus: 20, variance: 25 },
  'Mythic': { baseBonus: 25, variance: 28 }
};

/**
 * Trait category IDs from dim_social_trait_category
 */
const TRAIT_CATEGORIES = {
  friendliness: 1,
  playfulness: 2,
  creativity: 3,
  empathy: 4,
  energy: 5,
  confidence: 6,
  humor: 7,
  curiosity: 8
};

/**
 * Generate a random variance using normal distribution
 * @param {number} mean - Center value
 * @param {number} stdDev - Standard deviation
 * @returns {number} Random value
 */
function normalRandom(mean, stdDev) {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * stdDev + mean;
}

/**
 * Generate trait scores for a creature
 * @param {string} bodyTypeName - Name of the body type
 * @param {string} rarityTier - Rarity tier (Common, Uncommon, Rare, Epic, Legendary, Mythic)
 * @returns {object} Object with trait category IDs as keys and scores as values
 */
function generateTraits(bodyTypeName, rarityTier) {
  let bodyTypeConfig = BODY_TYPE_TRAITS[bodyTypeName];
  const rarityConfig = RARITY_CONFIG[rarityTier] || RARITY_CONFIG['Common'];

  if (!bodyTypeConfig) {
    console.warn(`Unknown body type: ${bodyTypeName}, using default traits`);
    // Use balanced default
    const defaultTraits = {
      friendliness: 50, playfulness: 50, creativity: 50, empathy: 50,
      energy: 50, confidence: 50, humor: 50, curiosity: 50
    };
    bodyTypeConfig = defaultTraits;
  }

  const traits = {};

  for (const [traitName, baseValue] of Object.entries(bodyTypeConfig)) {
    const categoryId = TRAIT_CATEGORIES[traitName];
    if (!categoryId) continue;

    // Apply randomness with variance based on rarity
    const randomVariance = normalRandom(0, rarityConfig.variance);

    // Calculate score: base + rarity bonus + random variance
    let score = baseValue + rarityConfig.baseBonus + randomVariance;

    // Clamp to 0-100
    score = Math.max(0, Math.min(100, Math.round(score)));

    traits[categoryId] = score;
  }

  return traits;
}

/**
 * Insert or update traits for a creature in the database
 * @param {object} client - PostgreSQL client
 * @param {string} creatureId - Creature UUID
 * @param {object} traits - Object with trait category IDs as keys and scores as values
 */
async function saveTraits(client, creatureId, traits) {
  for (const [categoryId, score] of Object.entries(traits)) {
    await client.query(`
      INSERT INTO creature_social_traits (creature_id, trait_category_id, score)
      VALUES ($1, $2, $3)
      ON CONFLICT (creature_id, trait_category_id)
      DO UPDATE SET score = $3
    `, [creatureId, categoryId, score]);
  }
}

module.exports = {
  generateTraits,
  saveTraits,
  BODY_TYPE_TRAITS,
  RARITY_CONFIG
};
