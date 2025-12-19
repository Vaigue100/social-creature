/**
 * Reusable Creature Card Renderer
 * Provides a consistent card structure across all pages
 * Used in: carousel, modals, notifications, etc.
 */

class CreatureCardRenderer {
    constructor() {
        // URL helpers
        this.getImageUrl = window.getImageUrl || ((filename) => {
            if (!filename) return '/assets/placeholder.png';
            const baseUrl = window.location.hostname === 'localhost' ?
                'http://localhost:11434' : 'https://chatlingsstorage.blob.core.windows.net';
            return `${baseUrl}/chatlings-images/${filename}`;
        });

        this.getArtworkUrl = window.getArtworkUrl || ((filename) => {
            if (!filename) return '';
            const baseUrl = window.location.hostname === 'localhost' ?
                'http://localhost:11434' : 'https://chatlingsstorage.blob.core.windows.net';
            return `${baseUrl}/chatlings-artwork/${filename}`;
        });

        this.getAnimationUrl = window.getAnimationUrl || ((filename) => {
            if (!filename) return '';
            const baseUrl = window.location.hostname === 'localhost' ?
                'http://localhost:11434' : 'https://chatlingsstorage.blob.core.windows.net';
            return `${baseUrl}/chatlings-animations/${filename}`;
        });
    }

    /**
     * Fetch all data needed to render a creature card
     * @param {string} creatureId - The creature ID
     * @param {string} userId - Optional user ID for user-specific stats
     * @returns {Promise<Object>} Complete creature card data
     */
    async fetchCreatureCardData(creatureId, userId = null) {
        try {
            // Fetch creature details
            const creatureResponse = await fetch(`/api/creature/${creatureId}/details`);
            if (!creatureResponse.ok) throw new Error('Failed to load creature');
            const creature = await creatureResponse.json();

            // Fetch body types for frame and lore info
            let bodyType = null;
            if (creature.body_type_id) {
                try {
                    const bodyTypesResponse = await fetch('/api/body-types');
                    if (bodyTypesResponse.ok) {
                        const bodyTypes = await bodyTypesResponse.json();
                        bodyType = bodyTypes.find(bt => bt.id === creature.body_type_id);
                    }
                } catch (e) {
                    console.warn('Could not fetch body type data:', e);
                }
            }

            // Fetch traits
            let traits = [];
            try {
                const traitsResponse = await fetch(`/api/creature/${creatureId}/traits`);
                if (traitsResponse.ok) {
                    const traitsData = await traitsResponse.json();
                    traits = traitsData.traits || [];
                }
            } catch (e) {
                console.warn('Could not fetch traits:', e);
            }

            // Fetch user stats (Rizz & Glow) if userId provided
            let rizz = 0, glow = 0;
            if (userId) {
                try {
                    const statsResponse = await fetch(`/api/user/${userId}/creature/${creatureId}/stats`);
                    if (statsResponse.ok) {
                        const stats = await statsResponse.json();
                        rizz = stats.rizz || 0;
                        glow = stats.glow || 0;
                    }
                } catch (e) {
                    console.warn('Could not fetch user stats:', e);
                }
            }

            return {
                creature,
                bodyType,
                traits,
                rizz,
                glow
            };
        } catch (error) {
            console.error('Error fetching creature card data:', error);
            throw error;
        }
    }

    /**
     * Render the full creature card HTML structure
     * @param {Object} data - Data from fetchCreatureCardData
     * @param {Object} options - Rendering options
     * @returns {string} HTML string for the creature card
     */
    renderCreatureCardHTML(data, options = {}) {
        const { creature, bodyType, traits, rizz, glow } = data;
        const {
            cardId = 'creature-card',
            includeVideo = false,
            maxHeight = '500px',
            isCarousel = false
        } = options;

        const imagePath = creature.selected_image ? this.getImageUrl(creature.selected_image) : '/assets/placeholder.png';
        const rarityClass = `rarity-${(creature.rarity_tier || 'Common').toLowerCase().replace(' ', '-')}`;

        // Frame data
        const frameUrl = bodyType && bodyType.frame_filename ? this.getArtworkUrl(bodyType.frame_filename) : '';
        const frameWidth = bodyType?.frame_width_percent || 100;
        const frameHeight = bodyType?.frame_height_percent || 100;

        // Calculate total trait score
        const traitTotal = traits.reduce((sum, t) => sum + (t.score || 0), 0);

        // Generate trait grid items HTML
        const traitGridItems = traits.map(trait => `
            <div class="trait-grid-item">
                <div class="trait-grid-icon">${trait.icon || '⭐'}</div>
                <div class="trait-grid-label">${trait.trait_name || trait.category_name || 'Trait'}</div>
                <div class="trait-grid-value">${trait.score || 0}</div>
            </div>
        `).join('');

        // Get lore font from body type
        const loreFont = bodyType?.lore_font || 'Georgia, serif';
        const speciesLore = bodyType?.species_lore || `${creature.body_type_name || 'These'} creatures are known for their unique characteristics and adaptations. Each one has evolved distinct traits that help them thrive in their environment.`;

        return `
            <div class="creature-card-full" id="${cardId}">
                <div class="creature-frame-wrapper ${frameUrl ? 'has-frame' : ''}">
                    ${frameUrl ? `<div class="creature-frame-overlay" style="background-image: url('${frameUrl}'); width: ${frameWidth}%; height: ${frameHeight}%; left: ${(100 - frameWidth) / 2}%; top: ${(100 - frameHeight) / 2}%;"></div>` : ''}
                    <div class="creature-frame-content">

                        <!-- Flip card inner - wraps all three faces -->
                        <div class="flip-card-inner" id="flip-inner-${cardId}" onclick="window.creatureCardRenderer.flipCard('${cardId}')">

                            <!-- Front Face: Creature Image -->
                            <div class="flip-card-face flip-card-front">
                                <div class="creature-image-container" id="creature-img-${cardId}">
                                    ${includeVideo ? `<video class="creature-carousel-video" style="display: none; max-height: ${maxHeight}; width: auto;" playsinline></video>` : ''}
                                    <img src="${imagePath}"
                                         alt="${creature.creature_name}"
                                         style="max-height: ${maxHeight}; width: auto; display: block;"
                                         onerror="this.src='/assets/placeholder.png'">
                                </div>
                            </div>

                            <!-- Traits Face: Rizz & Glow + 4x2 Grid -->
                            <div class="flip-card-face flip-card-traits">
                                <!-- Rizz & Glow special stats at top -->
                                <div class="special-stats-container">
                                    <div class="special-stat">
                                        <div class="special-stat-icon">🔥</div>
                                        <div class="special-stat-label">Rizz</div>
                                        <div class="special-stat-value">${rizz}</div>
                                    </div>
                                    <div class="special-stat">
                                        <div class="special-stat-icon">✨</div>
                                        <div class="special-stat-label">Glow</div>
                                        <div class="special-stat-value">${glow}</div>
                                    </div>
                                </div>

                                <!-- Social traits grid -->
                                <div class="trait-grid">
                                    ${traitGridItems}
                                </div>
                            </div>

                            <!-- Lore Face: Creature Lore -->
                            <div class="flip-card-face flip-card-lore">
                                <div class="lore-display" style="font-family: ${loreFont}">
                                    <h3>${creature.creature_name}'s Story</h3>
                                    <p>${creature.vibe || 'A mysterious creature with an untold story...'}</p>

                                    <h4>Species: ${creature.body_type_name || 'Unknown'}</h4>
                                    <p>${speciesLore}</p>
                                </div>
                            </div>

                        </div>

                        <!-- Creature Info - Always visible, outside flip area -->
                        <div class="creature-lore-section">
                            <div class="carousel-card-header">
                                <div class="carousel-card-rarity ${rarityClass}" onclick="event.stopPropagation(); window.creatureCardRenderer.showLore('${cardId}')" style="cursor: pointer;">
                                    ${creature.creature_name}
                                </div>
                                <div class="carousel-card-trait-total" onclick="event.stopPropagation(); window.creatureCardRenderer.flipCard('${cardId}')" style="cursor: pointer;">
                                    ⭐ ${traitTotal}
                                </div>
                            </div>
                            ${!isCarousel ? `<div class="carousel-card-subtitle">${creature.rarity_tier || 'Common'} • ${creature.body_type_name || ''}</div>` : ''}
                        </div>

                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Initialize flip card interactions for a rendered card
     * Call this after inserting the card HTML into the DOM
     * @param {string} cardId - The card ID used in renderCreatureCardHTML
     */
    initializeCard(cardId) {
        // Track flip state for this card (0=creature, 1=traits, 2=lore)
        if (!window.cardFlipStates) {
            window.cardFlipStates = {};
        }
        window.cardFlipStates[cardId] = 0;
    }

    /**
     * Flip between creature image and traits
     * @param {string} cardId - The card ID
     */
    flipCard(cardId) {
        const flipInner = document.getElementById(`flip-inner-${cardId}`);
        if (!flipInner) return;

        if (!window.cardFlipStates) window.cardFlipStates = {};
        if (!window.cardFlipStates[cardId]) window.cardFlipStates[cardId] = 0;

        // Toggle between creature and traits
        if (window.cardFlipStates[cardId] === 0) {
            // Go to traits
            window.cardFlipStates[cardId] = 1;
            flipInner.classList.remove('flip-to-lore');
            flipInner.classList.add('flip-to-traits');
        } else {
            // Go back to creature
            window.cardFlipStates[cardId] = 0;
            flipInner.classList.remove('flip-to-traits');
            flipInner.classList.remove('flip-to-lore');
        }
    }

    /**
     * Show/hide lore face
     * @param {string} cardId - The card ID
     */
    showLore(cardId) {
        const flipInner = document.getElementById(`flip-inner-${cardId}`);
        if (!flipInner) return;

        if (!window.cardFlipStates) window.cardFlipStates = {};
        if (!window.cardFlipStates[cardId]) window.cardFlipStates[cardId] = 0;

        // Toggle between creature and lore
        if (window.cardFlipStates[cardId] === 0 || window.cardFlipStates[cardId] === 1) {
            // Go to lore
            window.cardFlipStates[cardId] = 2;
            flipInner.classList.remove('flip-to-traits');
            flipInner.classList.add('flip-to-lore');
        } else {
            // Go back to creature
            window.cardFlipStates[cardId] = 0;
            flipInner.classList.remove('flip-to-traits');
            flipInner.classList.remove('flip-to-lore');
        }
    }

    /**
     * Convenience method: Fetch data and render card in one call
     * @param {string} creatureId - Creature ID
     * @param {string} userId - Optional user ID
     * @param {Object} options - Rendering options
     * @returns {Promise<string>} HTML string
     */
    async renderCard(creatureId, userId = null, options = {}) {
        const data = await this.fetchCreatureCardData(creatureId, userId);
        return this.renderCreatureCardHTML(data, options);
    }
}

// Create global instance
window.creatureCardRenderer = new CreatureCardRenderer();
