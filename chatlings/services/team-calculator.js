/**
 * Team Score Calculator
 * Handles hierarchical team scoring with Rizz cascade and body type affinity
 */

const ROLE_MULTIPLIERS = {
  architect: 1.5,  // Leader bonus
  prime: 1.3,      // Second-in-command
  analyst: 1.2,    // Specialist (intelligence)
  engineer: 1.2,   // Specialist (technical)
  clerk: 1.2,      // Specialist (administrative)
  assistant: 1.0   // Entry level
};

const SPECIALIST_TRAITS = {
  analyst: ['Creativity', 'Wisdom'],
  engineer: ['Confidence', 'Team Player'],
  clerk: ['Energy Level', 'Empathy']
};

const AFFINITY_BONUSES = {
  PARENT_MATCH: 1.0,    // Same body type as parent
  SIBLING_MATCH: 0.5,   // Per sibling with same body type
  CHILD_MATCH: 0.3,     // Per child with same body type
  MAX_SIBLING: 1.5,     // Cap for sibling bonuses
  MAX_CHILD: 1.0        // Cap for child bonuses
};

const RIZZ_CASCADE = {
  PARENT: 0.10,         // 10% from parent
  GRANDPARENT: 0.05,    // 5% from grandparent
  GREAT_GRANDPARENT: 0.02 // 2% from great-grandparent
};

/**
 * Calculate effective Glow with both vertical (Rizz) and horizontal (Affinity) bonuses
 */
function calculateEffectiveGlow(chatling, teamTree) {
  let glow = chatling.base_glow || 0;
  let verticalBonus = 0;
  let horizontalBonus = 0;

  const details = {
    base: glow,
    vertical: {},
    horizontal: {},
    total: 0
  };

  // VERTICAL: Rizz cascade from ancestors
  if (chatling.parent) {
    const parentRizzBonus = (chatling.parent.rizz || 0) * RIZZ_CASCADE.PARENT;
    verticalBonus += parentRizzBonus;
    details.vertical.parent = {
      name: chatling.parent.creature_name,
      rizz: chatling.parent.rizz,
      bonus: parentRizzBonus
    };

    if (chatling.parent.parent) {
      const grandparentRizzBonus = (chatling.parent.parent.rizz || 0) * RIZZ_CASCADE.GRANDPARENT;
      verticalBonus += grandparentRizzBonus;
      details.vertical.grandparent = {
        name: chatling.parent.parent.creature_name,
        rizz: chatling.parent.parent.rizz,
        bonus: grandparentRizzBonus
      };

      if (chatling.parent.parent.parent) {
        const greatGrandparentBonus = (chatling.parent.parent.parent.rizz || 0) * RIZZ_CASCADE.GREAT_GRANDPARENT;
        verticalBonus += greatGrandparentBonus;
        details.vertical.greatGrandparent = {
          name: chatling.parent.parent.parent.creature_name,
          rizz: chatling.parent.parent.parent.rizz,
          bonus: greatGrandparentBonus
        };
      }
    }
  }

  // HORIZONTAL: Body type affinity
  // 1. Parent match
  if (chatling.parent && chatling.body_type === chatling.parent.body_type) {
    horizontalBonus += AFFINITY_BONUSES.PARENT_MATCH;
    details.horizontal.parentMatch = {
      bodyType: chatling.body_type,
      bonus: AFFINITY_BONUSES.PARENT_MATCH
    };
  }

  // 2. Sibling match
  const siblings = chatling.siblings || [];
  const matchingSiblings = siblings.filter(s => s.body_type === chatling.body_type);
  if (matchingSiblings.length > 0) {
    const siblingBonus = Math.min(
      matchingSiblings.length * AFFINITY_BONUSES.SIBLING_MATCH,
      AFFINITY_BONUSES.MAX_SIBLING
    );
    horizontalBonus += siblingBonus;
    details.horizontal.siblings = {
      count: matchingSiblings.length,
      bonus: siblingBonus
    };
  }

  // 3. Child match
  const children = chatling.children || [];
  const matchingChildren = children.filter(c => c.body_type === chatling.body_type);
  if (matchingChildren.length > 0) {
    const childBonus = Math.min(
      matchingChildren.length * AFFINITY_BONUSES.CHILD_MATCH,
      AFFINITY_BONUSES.MAX_CHILD
    );
    horizontalBonus += childBonus;
    details.horizontal.children = {
      count: matchingChildren.length,
      bonus: childBonus
    };
  }

  const totalGlow = glow + verticalBonus + horizontalBonus;
  details.verticalTotal = verticalBonus;
  details.horizontalTotal = horizontalBonus;
  details.total = totalGlow;

  return {
    effectiveGlow: totalGlow,
    details
  };
}

/**
 * Calculate effective trait score with Glow multiplier
 */
function calculateEffectiveTraits(chatling, effectiveGlow) {
  const glowMultiplier = 1 + (effectiveGlow / 100);

  // Get base trait total
  let baseTraits = 0;
  if (chatling.traits && Array.isArray(chatling.traits)) {
    baseTraits = chatling.traits.reduce((sum, trait) => sum + (trait.score || 0), 0);
  } else if (typeof chatling.total_traits === 'number') {
    baseTraits = chatling.total_traits;
  }

  return baseTraits * glowMultiplier;
}

/**
 * Calculate specialist bonus for role-specific traits
 */
function calculateSpecialistBonus(chatling) {
  const positionType = chatling.position_type;
  const specialistTraits = SPECIALIST_TRAITS[positionType];

  if (!specialistTraits || !chatling.traits) {
    return 0;
  }

  // Specialist traits count double
  let bonus = 0;
  chatling.traits.forEach(trait => {
    if (specialistTraits.includes(trait.trait_name)) {
      bonus += trait.score; // Add the trait value again (doubling it)
    }
  });

  return bonus;
}

/**
 * Calculate contribution for a single team member
 */
function calculateMemberContribution(chatling, teamTree) {
  const glowResult = calculateEffectiveGlow(chatling, teamTree);
  const effectiveTraits = calculateEffectiveTraits(chatling, glowResult.effectiveGlow);
  const specialistBonus = calculateSpecialistBonus(chatling);
  const roleMultiplier = ROLE_MULTIPLIERS[chatling.position_type] || 1.0;

  const contribution = (effectiveTraits + specialistBonus) * roleMultiplier;

  return {
    creature_id: chatling.creature_id,
    creature_name: chatling.creature_name,
    position_type: chatling.position_type,
    level: chatling.level,
    body_type: chatling.body_type,
    baseTraits: effectiveTraits - specialistBonus,
    specialistBonus,
    roleMultiplier,
    glowDetails: glowResult.details,
    contribution,
    effectiveGlow: glowResult.effectiveGlow
  };
}

/**
 * Calculate synergy bonus based on number of positions filled
 */
function calculateSynergyBonus(baseScore, numPositions) {
  // 15% bonus per position filled
  return baseScore * (0.15 * numPositions);
}

/**
 * Calculate tier completion bonuses
 */
function calculateTierBonuses(teamTree) {
  let bonus = 0;
  const levelCounts = {1: 0, 2: 0, 3: 0, 4: 0};

  // Count positions at each level
  function countLevels(node) {
    levelCounts[node.level]++;
    (node.children || []).forEach(countLevels);
  }

  if (teamTree.architect) {
    countLevels(teamTree.architect);
  }

  // Level 2 filled: +5% bonus
  if (levelCounts[2] >= 1) {
    bonus += 150;
  }

  // Level 3 fully filled (all 3 positions): +10% bonus
  if (levelCounts[3] >= 3) {
    bonus += 300;
  }

  // Level 4 fully filled (all 3 positions): +15% bonus
  if (levelCounts[4] >= 3) {
    bonus += 450;
  }

  return {
    bonus,
    levelCounts
  };
}

/**
 * Calculate affinity diversity bonus
 * Rewards some diversity while encouraging affinity
 */
function calculateAffinityDiversityBonus(teamTree, totalAffinityConnections) {
  const bodyTypes = new Set();

  function collectBodyTypes(node) {
    bodyTypes.add(node.body_type);
    (node.children || []).forEach(collectBodyTypes);
  }

  if (teamTree.architect) {
    collectBodyTypes(teamTree.architect);
  }

  const numUniqueBodyTypes = bodyTypes.size;

  // Diversity component: max 0.10 for 4+ different body types
  const diversityBonus = Math.min(numUniqueBodyTypes / 4, 1.0) * 0.10;

  // Affinity component: max 0.05 for lots of affinity connections
  const affinityBonus = Math.min(totalAffinityConnections / 10, 1.0) * 0.05;

  return diversityBonus + affinityBonus;
}

/**
 * Main team score calculation
 */
function calculateTeamScore(teamTree) {
  if (!teamTree || !teamTree.architect) {
    return {
      totalScore: 0,
      breakdown: {
        baseScore: 0,
        synergyBonus: 0,
        tierBonus: 0,
        affinityDiversityBonus: 0
      },
      members: [],
      levelContributions: {1: 0, 2: 0, 3: 0, 4: 0}
    };
  }

  const members = [];
  const levelContributions = {1: 0, 2: 0, 3: 0, 4: 0};
  let totalAffinityConnections = 0;

  // Recursive function to calculate all members
  function processMember(node) {
    const contribution = calculateMemberContribution(node, teamTree);
    members.push(contribution);
    levelContributions[node.level] += contribution.contribution;

    // Count affinity connections
    if (contribution.glowDetails.horizontal.parentMatch) totalAffinityConnections++;
    if (contribution.glowDetails.horizontal.siblings) {
      totalAffinityConnections += contribution.glowDetails.horizontal.siblings.count;
    }
    if (contribution.glowDetails.horizontal.children) {
      totalAffinityConnections += contribution.glowDetails.horizontal.children.count;
    }

    (node.children || []).forEach(processMember);
  }

  processMember(teamTree.architect);

  // Calculate base score
  const baseScore = members.reduce((sum, m) => sum + m.contribution, 0);

  // Calculate bonuses
  const synergyBonus = calculateSynergyBonus(baseScore, members.length);
  const tierResult = calculateTierBonuses(teamTree);
  const affinityDiversityMultiplier = calculateAffinityDiversityBonus(teamTree, totalAffinityConnections);

  // Final score
  const totalScore = (baseScore + synergyBonus) * (1 + affinityDiversityMultiplier) + tierResult.bonus;

  return {
    totalScore: Math.round(totalScore * 100) / 100,
    breakdown: {
      baseScore: Math.round(baseScore * 100) / 100,
      synergyBonus: Math.round(synergyBonus * 100) / 100,
      affinityDiversityMultiplier: Math.round(affinityDiversityMultiplier * 10000) / 100, // As percentage
      tierBonus: tierResult.bonus,
      tierCounts: tierResult.levelCounts
    },
    members,
    levelContributions,
    numPositions: members.length,
    numAffinityConnections: totalAffinityConnections
  };
}

module.exports = {
  calculateTeamScore,
  calculateEffectiveGlow,
  calculateEffectiveTraits,
  calculateMemberContribution,
  ROLE_MULTIPLIERS,
  AFFINITY_BONUSES,
  RIZZ_CASCADE
};
