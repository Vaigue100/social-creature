/**
 * Trait Badges Component
 * Reusable JavaScript for loading and displaying creature social trait scores
 *
 * Usage:
 *   <div id="traits-container"></div>
 *   <script>
 *     TraitBadges.load('creature-id-here', 'traits-container');
 *   </script>
 */

const TraitBadges = {
  /**
   * Load and display trait badges for a creature
   * @param {string} creatureId - The creature ID
   * @param {string} containerId - The DOM element ID to render badges into
   * @param {object} options - Optional configuration
   */
  async load(creatureId, containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`TraitBadges: Container "${containerId}" not found`);
      return;
    }

    // Set loading state
    container.className = 'trait-badges-loading';
    container.innerHTML = options.loadingText || 'Loading traits...';

    try {
      const response = await fetch(`/api/creature/${creatureId}/traits`);

      if (!response.ok) {
        if (options.hideOnError !== false) {
          container.style.display = 'none';
        } else {
          container.innerHTML = 'Unable to load traits';
        }
        return null;
      }

      const traits = await response.json();
      this.render(traits, containerId, options);
      return traits;

    } catch (error) {
      console.error('Error loading trait badges:', error);
      if (options.hideOnError !== false) {
        container.style.display = 'none';
      } else {
        container.innerHTML = 'Error loading traits';
      }
      return null;
    }
  },

  /**
   * Render trait badges (use this if you already have the trait data)
   * @param {array} traits - Array of trait objects with score, category_name, icon, description
   * @param {string} containerId - The DOM element ID to render badges into
   * @param {object} options - Optional configuration
   */
  render(traits, containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`TraitBadges: Container "${containerId}" not found`);
      return;
    }

    // Apply variant classes
    let className = 'trait-badges';
    if (options.variant === 'compact') className += ' compact';
    if (options.variant === 'inline') className += ' inline';
    container.className = className;
    container.innerHTML = '';

    // Sort traits if requested
    let sortedTraits = [...traits];
    if (options.sortBy === 'score-desc') {
      sortedTraits.sort((a, b) => b.score - a.score);
    } else if (options.sortBy === 'score-asc') {
      sortedTraits.sort((a, b) => a.score - b.score);
    } else if (options.sortBy === 'name') {
      sortedTraits.sort((a, b) => a.category_name.localeCompare(b.category_name));
    }

    // Render each trait badge
    sortedTraits.forEach(trait => {
      const badge = this.createBadge(trait, options);
      container.appendChild(badge);
    });
  },

  /**
   * Create a single badge element
   * @param {object} trait - Trait data
   * @param {object} options - Optional configuration
   * @returns {HTMLElement} The badge element
   */
  createBadge(trait, options = {}) {
    const badge = document.createElement('div');

    // Base classes
    let className = 'trait-badge';
    if (options.showTooltip !== false) {
      className += ' trait-badge-tooltip';
    }

    // Color-coded by score
    if (options.colorByScore) {
      if (trait.score < 35) className += ' score-low';
      else if (trait.score < 70) className += ' score-medium';
      else className += ' score-high';
    }

    badge.className = className;

    // Add tooltip
    if (options.showTooltip !== false) {
      const tooltipText = options.customTooltip
        ? options.customTooltip(trait)
        : `${trait.category_name}: ${trait.description}`;
      badge.setAttribute('data-tooltip', tooltipText);
    }

    // Add category data attribute for CSS styling
    badge.setAttribute('data-category', trait.category_name);

    // Build badge content
    let content = `<span class="trait-icon">${trait.icon}</span>`;
    content += `<span class="trait-score">${trait.score}</span>`;

    // Optional: show trait name
    if (options.showName) {
      content += `<span class="trait-name">${trait.category_name}</span>`;
    }

    badge.innerHTML = content;

    // Optional: click handler
    if (options.onClick) {
      badge.style.cursor = 'pointer';
      badge.addEventListener('click', () => options.onClick(trait));
    }

    return badge;
  },

  /**
   * Bulk load traits for multiple creatures (efficient batching)
   * @param {array} creatureIds - Array of creature IDs
   * @param {function} callback - Called with (creatureId, traits) for each result
   */
  async loadBulk(creatureIds, callback) {
    // Load in parallel for better performance
    const promises = creatureIds.map(async (creatureId) => {
      try {
        const response = await fetch(`/api/creature/${creatureId}/traits`);
        if (response.ok) {
          const traits = await response.json();
          callback(creatureId, traits);
          return { creatureId, traits };
        }
      } catch (error) {
        console.error(`Error loading traits for ${creatureId}:`, error);
      }
      return { creatureId, traits: null };
    });

    return Promise.all(promises);
  },

  /**
   * Get score category (low/medium/high)
   * @param {number} score - The score value
   * @returns {string} 'low', 'medium', or 'high'
   */
  getScoreCategory(score) {
    if (score < 35) return 'low';
    if (score < 70) return 'medium';
    return 'high';
  },

  /**
   * Format trait for display
   * @param {object} trait - Trait object
   * @returns {string} Formatted string
   */
  format(trait) {
    return `${trait.icon} ${trait.category_name}: ${trait.score}`;
  }
};

// Make available globally
if (typeof window !== 'undefined') {
  window.TraitBadges = TraitBadges;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TraitBadges;
}
