/**
 * Glow Calculator Service
 * Context-aware glow calculation for YouTube chatroom participation
 */

// Optimal attitude profiles for different video types
const OPTIMAL_ATTITUDES = {
  // Entertainment categories
  MUSIC: {
    enthusiasm: { min: 7, max: 10, weight: 0.4 },
    criticism: { min: 1, max: 4, weight: 0.2 },
    humor: { min: 5, max: 10, weight: 0.4 }
  },

  COMEDY: {
    enthusiasm: { min: 6, max: 10, weight: 0.3 },
    criticism: { min: 1, max: 5, weight: 0.2 },
    humor: { min: 8, max: 10, weight: 0.5 }
  },

  GAMING: {
    enthusiasm: { min: 6, max: 10, weight: 0.35 },
    criticism: { min: 2, max: 6, weight: 0.25 },
    humor: { min: 5, max: 9, weight: 0.4 }
  },

  ENTERTAINMENT: {
    enthusiasm: { min: 7, max: 10, weight: 0.4 },
    criticism: { min: 2, max: 5, weight: 0.2 },
    humor: { min: 6, max: 10, weight: 0.4 }
  },

  // Review/Analysis content
  REVIEW: {
    enthusiasm: { min: 3, max: 7, weight: 0.2 },
    criticism: { min: 6, max: 10, weight: 0.5 },
    humor: { min: 2, max: 5, weight: 0.3 }
  },

  // Educational content
  EDUCATION: {
    enthusiasm: { min: 5, max: 8, weight: 0.3 },
    criticism: { min: 4, max: 7, weight: 0.4 },
    humor: { min: 3, max: 6, weight: 0.3 }
  },

  'SCIENCE_TECH': {
    enthusiasm: { min: 5, max: 8, weight: 0.3 },
    criticism: { min: 5, max: 9, weight: 0.4 },
    humor: { min: 2, max: 5, weight: 0.3 }
  },

  'HOWTO_STYLE': {
    enthusiasm: { min: 6, max: 9, weight: 0.35 },
    criticism: { min: 4, max: 7, weight: 0.35 },
    humor: { min: 3, max: 6, weight: 0.3 }
  },

  // Opinion/Discussion
  'NEWS_POLITICS': {
    enthusiasm: { min: 4, max: 7, weight: 0.3 },
    criticism: { min: 6, max: 9, weight: 0.4 },
    humor: { min: 2, max: 5, weight: 0.3 }
  },

  'PEOPLE_BLOGS': {
    enthusiasm: { min: 6, max: 9, weight: 0.35 },
    criticism: { min: 3, max: 6, weight: 0.3 },
    humor: { min: 5, max: 8, weight: 0.35 }
  },

  DRAMA: {
    enthusiasm: { min: 2, max: 6, weight: 0.25 },
    criticism: { min: 7, max: 10, weight: 0.45 },
    humor: { min: 4, max: 8, weight: 0.3 }
  },

  // Inspirational
  INSPIRATIONAL: {
    enthusiasm: { min: 8, max: 10, weight: 0.5 },
    criticism: { min: 1, max: 3, weight: 0.2 },
    humor: { min: 3, max: 7, weight: 0.3 }
  },

  // Tutorial
  TUTORIAL: {
    enthusiasm: { min: 5, max: 8, weight: 0.3 },
    criticism: { min: 5, max: 8, weight: 0.4 },
    humor: { min: 2, max: 5, weight: 0.3 }
  },

  // Lifestyle
  SPORTS: {
    enthusiasm: { min: 7, max: 10, weight: 0.4 },
    criticism: { min: 5, max: 9, weight: 0.35 },
    humor: { min: 4, max: 8, weight: 0.25 }
  },

  'TRAVEL_EVENTS': {
    enthusiasm: { min: 7, max: 10, weight: 0.4 },
    criticism: { min: 2, max: 5, weight: 0.25 },
    humor: { min: 5, max: 8, weight: 0.35 }
  },

  'PETS_ANIMALS': {
    enthusiasm: { min: 8, max: 10, weight: 0.45 },
    criticism: { min: 1, max: 4, weight: 0.2 },
    humor: { min: 6, max: 10, weight: 0.35 }
  },

  // Default
  GENERAL: {
    enthusiasm: { min: 5, max: 8, weight: 0.33 },
    criticism: { min: 4, max: 7, weight: 0.33 },
    humor: { min: 4, max: 7, weight: 0.34 }
  }
};

class GlowCalculator {
  /**
   * Calculate glow for chatroom participation
   *
   * @param {Object} userSettings - { enthusiasm, criticism, humor } (1-10)
   * @param {Object} videoContext - { category, subcategory }
   * @param {Array} userHistory - Previous participations (for variety bonus)
   * @returns {Object} { glow, breakdown }
   */
  calculateGlow(userSettings, videoContext, userHistory = []) {
    const breakdown = {
      base: 2,
      matchBonus: 0,
      extremismPenalty: 0,
      varietyBonus: 0,
      total: 0
    };

    // 1. Base participation reward
    let totalGlow = breakdown.base;

    // 2. Context matching bonus
    breakdown.matchBonus = this.calculateMatchBonus(userSettings, videoContext);
    totalGlow += breakdown.matchBonus;

    // 3. Extremism penalty
    breakdown.extremismPenalty = this.calculateExtremismPenalty(userSettings);
    totalGlow -= breakdown.extremismPenalty;

    // 4. Variety bonus
    breakdown.varietyBonus = this.calculateVarietyBonus(userSettings, userHistory);
    totalGlow += breakdown.varietyBonus;

    // Clamp to valid range
    breakdown.total = Math.max(-5, Math.min(10, Math.round(totalGlow)));

    return {
      glow: breakdown.total,
      breakdown: breakdown
    };
  }

  /**
   * Calculate bonus for matching attitude to video context
   */
  calculateMatchBonus(userSettings, videoContext) {
    const optimal = this.getOptimalProfile(videoContext);

    let totalScore = 0;
    let maxPossibleScore = 0;

    // Score each dimension
    ['enthusiasm', 'criticism', 'humor'].forEach(dimension => {
      const userValue = userSettings[dimension];
      const optimalRange = optimal[dimension];
      const weight = optimalRange.weight;

      const dimensionScore = this.scoreMatchToRange(
        userValue,
        optimalRange.min,
        optimalRange.max
      );

      totalScore += dimensionScore * weight;
      maxPossibleScore += 10 * weight;
    });

    // Normalize to 0-6 range
    const normalizedScore = (totalScore / maxPossibleScore) * 6;

    return Math.round(normalizedScore * 10) / 10; // Round to 1 decimal
  }

  /**
   * Score how well a value fits within optimal range
   */
  scoreMatchToRange(value, min, max) {
    // Perfect match: within range
    if (value >= min && value <= max) {
      return 10;
    }

    // Calculate distance from range
    let distance;
    if (value < min) {
      distance = min - value;
    } else {
      distance = value - max;
    }

    // Exponential decay
    const score = Math.max(0, 10 - (distance * distance * 0.4));

    return score;
  }

  /**
   * Penalty for extreme settings
   */
  calculateExtremismPenalty(userSettings) {
    const values = [
      userSettings.enthusiasm,
      userSettings.criticism,
      userSettings.humor
    ];

    // Calculate variance
    const average = values.reduce((a, b) => a + b) / values.length;
    const variance = values.reduce((sum, val) => {
      return sum + Math.pow(val - average, 2);
    }, 0) / values.length;

    // Low variance = all settings similar
    if (variance < 2) {
      return 2;
    }

    // All extremes
    const allHigh = values.every(v => v >= 8);
    const allLow = values.every(v => v <= 3);

    if (allHigh || allLow) {
      return 3;
    }

    return 0;
  }

  /**
   * Bonus for using variety over time
   */
  calculateVarietyBonus(userSettings, userHistory) {
    if (userHistory.length < 3) {
      return 0;
    }

    // Get last 5 participations
    const recent = userHistory.slice(-5);

    // Count unique combinations
    const uniqueCombinations = new Set(
      recent.map(h => `${h.enthusiasm}-${h.criticism}-${h.humor}`)
    ).size;

    // Reward variety
    if (uniqueCombinations >= 4) {
      return 1;
    }

    // Penalty for always using same
    if (uniqueCombinations === 1) {
      return -1;
    }

    return 0;
  }

  /**
   * Get optimal profile for video context
   */
  getOptimalProfile(videoContext) {
    // Try subcategory first
    if (videoContext.subcategory && OPTIMAL_ATTITUDES[videoContext.subcategory]) {
      return OPTIMAL_ATTITUDES[videoContext.subcategory];
    }

    // Try main category
    if (videoContext.category && OPTIMAL_ATTITUDES[videoContext.category]) {
      return OPTIMAL_ATTITUDES[videoContext.category];
    }

    // Fallback
    return OPTIMAL_ATTITUDES.GENERAL;
  }

  /**
   * Get optimal ranges for a video (for UI display)
   */
  getOptimalRanges(videoContext) {
    const optimal = this.getOptimalProfile(videoContext);

    return {
      enthusiasm: { min: optimal.enthusiasm.min, max: optimal.enthusiasm.max },
      criticism: { min: optimal.criticism.min, max: optimal.criticism.max },
      humor: { min: optimal.humor.min, max: optimal.humor.max }
    };
  }

  /**
   * Get hint text for video type
   */
  getHint(videoContext) {
    const hints = {
      REVIEW: "Critical analysis works well here",
      COMEDY: "Humor and enthusiasm shine in comedy",
      MUSIC: "Let your enthusiasm flow!",
      EDUCATION: "Balanced, thoughtful approach recommended",
      DRAMA: "Strong opinions and criticism valued",
      INSPIRATIONAL: "Positivity and enthusiasm excel",
      TUTORIAL: "Constructive criticism is appreciated",
      SPORTS: "Passion and debate encouraged",
      GAMING: "Enthusiastic and playful works great",
      'SCIENCE_TECH': "Analytical thinking appreciated",
      'NEWS_POLITICS': "Balanced perspective valued",
      'PETS_ANIMALS': "Enthusiasm for cute content!",
      GENERAL: "Adapt your approach to the content"
    };

    // Try subcategory first
    if (videoContext.subcategory && hints[videoContext.subcategory]) {
      return hints[videoContext.subcategory];
    }

    // Try main category
    if (videoContext.category && hints[videoContext.category]) {
      return hints[videoContext.category];
    }

    return hints.GENERAL;
  }

  /**
   * Analyze video context from title/description
   */
  analyzeVideoContext(video) {
    const category = video.category || video.snippet?.categoryId;
    const title = (video.title || video.snippet?.title || '').toLowerCase();
    const description = (video.description || video.snippet?.description || '').toLowerCase();

    const subcategory = this.detectSubcategory(title, description);

    return {
      category: this.mapCategoryId(category),
      subcategory: subcategory,
      title: video.title || video.snippet?.title,
      description: description.slice(0, 200)
    };
  }

  /**
   * Detect subcategory from title/description keywords
   */
  detectSubcategory(title, description) {
    const text = `${title} ${description}`;

    // Review detection
    if (/(review|unboxing|comparison|vs|tested|first look)/i.test(text)) {
      return 'REVIEW';
    }

    // Tutorial detection
    if (/(tutorial|how to|guide|learn|tips|step by step)/i.test(text)) {
      return 'TUTORIAL';
    }

    // Drama/controversy
    if (/(drama|exposed|shocking|controversy|scandal|beef)/i.test(text)) {
      return 'DRAMA';
    }

    // Inspirational
    if (/(inspiring|motivational|success|journey|story|overcome)/i.test(text)) {
      return 'INSPIRATIONAL';
    }

    return null;
  }

  /**
   * Map YouTube category ID to our category names
   */
  mapCategoryId(categoryId) {
    const mapping = {
      '10': 'MUSIC',
      '20': 'GAMING',
      '23': 'COMEDY',
      '24': 'ENTERTAINMENT',
      '27': 'EDUCATION',
      '28': 'SCIENCE_TECH',
      '26': 'HOWTO_STYLE',
      '25': 'NEWS_POLITICS',
      '22': 'PEOPLE_BLOGS',
      '17': 'SPORTS',
      '19': 'TRAVEL_EVENTS',
      '15': 'PETS_ANIMALS'
    };

    return mapping[String(categoryId)] || 'GENERAL';
  }
}

module.exports = new GlowCalculator();
