// Chatlings Idle Game
// Adapted from 0xVenture Capitalist (MIT License)

class IdleGame {
    constructor() {
        this.affectionPoints = 0;
        this.creatureBusinesses = [];
        this.userCreatures = [];
        this.lastUpdate = Date.now();
        this.saveInterval = null;
    }

    async init() {
        try {
            await this.loadUserCreatures();
            await this.loadGameState();
            this.startGameLoop();
            this.startAutoSave();
        } catch (error) {
            console.error('Failed to initialize idle game:', error);
        }
    }

    async loadUserCreatures() {
        const response = await fetch('/api/user/collection');
        const data = await response.json();
        this.userCreatures = data.creatures || [];

        // Initialize businesses based on user's creatures
        this.initializeBusinesses();
    }

    initializeBusinesses() {
        // Create a business for each unique creature the user owns
        this.creatureBusinesses = this.userCreatures.map((creature, index) => {
            return {
                id: creature.creature_id,
                creatureName: creature.creature_name,
                image: creature.selected_image,
                level: 0,
                owned: 0,
                baseRevenue: this.calculateBaseRevenue(creature),
                baseCost: this.calculateBaseCost(creature, index),
                cycleTime: this.calculateCycleTime(creature),
                hasManager: false,
                managerCost: this.calculateManagerCost(creature, index),
                progress: 0,
                unlockRequirement: index === 0 ? 0 : Math.pow(2, index - 1),
                rarity: creature.rarity_tier
            };
        });
    }

    calculateBaseRevenue(creature) {
        // Base revenue on creature stats
        const abilityScore = creature.ability_score || 1;
        const uniqueness = creature.uniqueness_score || 1;
        return Math.floor(abilityScore * uniqueness * 0.5);
    }

    calculateBaseCost(creature, index) {
        // Cost increases exponentially
        const rarityMultiplier = {
            'Common': 1,
            'Uncommon': 1.5,
            'Rare': 2,
            'Epic': 3,
            'Legendary': 5,
            'Mythical': 10
        };
        const multiplier = rarityMultiplier[creature.rarity_tier] || 1;
        return Math.floor(10 * Math.pow(1.5, index) * multiplier);
    }

    calculateCycleTime(creature) {
        // Cycle time based on strength (higher strength = faster cycles)
        const strength = creature.strength_score || 1;
        return Math.max(1, 10 - (strength / 10));
    }

    calculateManagerCost(creature, index) {
        return Math.floor(1000 * Math.pow(2, index));
    }

    async loadGameState() {
        try {
            const response = await fetch('/api/idle-game/state');
            if (response.ok) {
                const data = await response.json();
                if (data.state) {
                    this.affectionPoints = data.state.affection_points || 0;
                    this.lastUpdate = new Date(data.state.last_update).getTime();

                    // Merge saved state with businesses
                    const savedBusinesses = JSON.parse(data.state.businesses_state || '[]');
                    this.creatureBusinesses.forEach(business => {
                        const saved = savedBusinesses.find(b => b.id === business.id);
                        if (saved) {
                            business.level = saved.level || 0;
                            business.owned = saved.owned || 0;
                            business.hasManager = saved.hasManager || false;
                        }
                    });

                    // Calculate offline earnings
                    this.calculateOfflineProgress();
                }
            }
        } catch (error) {
            console.error('Failed to load game state:', error);
        }
    }

    calculateOfflineProgress() {
        const now = Date.now();
        const secondsOffline = Math.floor((now - this.lastUpdate) / 1000);

        if (secondsOffline > 0) {
            const offlineEarnings = Math.floor(this.getAffectionPerSecond() * secondsOffline);
            if (offlineEarnings > 0) {
                this.affectionPoints += offlineEarnings;
                this.showNotification(`Welcome back! You earned ${this.formatNumber(offlineEarnings)} affection points while away!`);
            }
        }

        this.lastUpdate = now;
    }

    async saveGameState() {
        try {
            const state = {
                affection_points: this.affectionPoints,
                businesses_state: JSON.stringify(this.creatureBusinesses.map(b => ({
                    id: b.id,
                    level: b.level,
                    owned: b.owned,
                    hasManager: b.hasManager
                }))),
                last_update: new Date().toISOString()
            };

            await fetch('/api/idle-game/state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(state)
            });
        } catch (error) {
            console.error('Failed to save game state:', error);
        }
    }

    startGameLoop() {
        setInterval(() => {
            this.update();
            this.render();
        }, 100); // Update 10 times per second
    }

    startAutoSave() {
        this.saveInterval = setInterval(() => {
            this.saveGameState();
        }, 10000); // Save every 10 seconds
    }

    update() {
        const deltaTime = 0.1; // 100ms in seconds

        this.creatureBusinesses.forEach(business => {
            if (business.owned > 0) {
                if (business.hasManager) {
                    // Auto-progress with manager
                    business.progress += deltaTime / business.cycleTime;

                    if (business.progress >= 1) {
                        const earnings = this.getBusinessRevenue(business);
                        this.affectionPoints += earnings;
                        business.progress = 0;
                    }
                }
            }
        });
    }

    render() {
        this.renderCurrency();
        this.renderBusinesses();
    }

    renderCurrency() {
        document.getElementById('affectionPoints').textContent = this.formatNumber(this.affectionPoints);
        document.getElementById('affectionPerSecond').textContent =
            this.formatNumber(this.getAffectionPerSecond()) + '/sec';
    }

    renderBusinesses() {
        const grid = document.getElementById('creaturesGrid');

        grid.innerHTML = this.creatureBusinesses.map(business => {
            const isLocked = this.affectionPoints < business.unlockRequirement;
            const canBuy = !isLocked && this.affectionPoints >= this.getCurrentCost(business);
            const canBuyManager = !business.hasManager && this.affectionPoints >= business.managerCost;

            return `
                <div class="creature-business ${isLocked ? 'locked' : ''}">
                    <div class="business-header">
                        <img src="${this.getImageUrl(business.image)}"
                             alt="${business.creatureName}"
                             class="creature-icon"
                             onerror="this.src='/assets/placeholder.png'">
                        <div class="business-info">
                            <h3 class="business-name">${business.creatureName}</h3>
                            <div class="business-level">Level ${business.level} • Owned: ${business.owned}</div>
                        </div>
                    </div>

                    ${isLocked ? `
                        <div class="unlock-requirement">
                            🔒 Unlocks at ${this.formatNumber(business.unlockRequirement)} points
                        </div>
                    ` : ''}

                    ${business.hasManager ? `
                        <div class="manager-status">
                            ✓ Manager Hired - Auto-collecting!
                        </div>
                    ` : ''}

                    ${business.owned > 0 && !business.hasManager ? `
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${business.progress * 100}%"></div>
                        </div>
                    ` : ''}

                    <div class="business-stats">
                        <div class="stat-item">
                            <span class="stat-label">Revenue</span>
                            <span class="stat-value">${this.formatNumber(this.getBusinessRevenue(business))}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Cycle Time</span>
                            <span class="stat-value">${business.cycleTime.toFixed(1)}s</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Cost</span>
                            <span class="stat-value">${this.formatNumber(this.getCurrentCost(business))}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Per Second</span>
                            <span class="stat-value">${this.formatNumber(this.getBusinessPerSecond(business))}</span>
                        </div>
                    </div>

                    <div class="business-actions">
                        ${business.owned > 0 && !business.hasManager ? `
                            <button class="action-button primary"
                                    onclick="game.collectRevenue('${business.id}')">
                                <span>Collect</span>
                                <span class="button-label">${this.formatNumber(this.getBusinessRevenue(business))}</span>
                            </button>
                        ` : ''}

                        <button class="action-button ${business.owned > 0 ? 'secondary' : 'primary'}"
                                onclick="game.buyBusiness('${business.id}')"
                                ${!canBuy ? 'disabled' : ''}>
                            <span>${business.owned > 0 ? 'Upgrade' : 'Buy'}</span>
                            <span class="button-label">${this.formatNumber(this.getCurrentCost(business))}</span>
                        </button>

                        ${business.owned > 0 && !business.hasManager ? `
                            <button class="action-button secondary"
                                    onclick="game.hireManager('${business.id}')"
                                    ${!canBuyManager ? 'disabled' : ''}>
                                <span>Hire Manager</span>
                                <span class="button-label">${this.formatNumber(business.managerCost)}</span>
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    buyBusiness(businessId) {
        const business = this.creatureBusinesses.find(b => b.id === businessId);
        if (!business) return;

        const cost = this.getCurrentCost(business);
        if (this.affectionPoints >= cost) {
            this.affectionPoints -= cost;
            business.owned++;
            business.level++;
            this.render();
            this.saveGameState();
        }
    }

    collectRevenue(businessId) {
        const business = this.creatureBusinesses.find(b => b.id === businessId);
        if (!business || business.owned === 0) return;

        const earnings = this.getBusinessRevenue(business);
        this.affectionPoints += earnings;
        business.progress = 0;
        this.render();
    }

    hireManager(businessId) {
        const business = this.creatureBusinesses.find(b => b.id === businessId);
        if (!business || business.hasManager) return;

        if (this.affectionPoints >= business.managerCost) {
            this.affectionPoints -= business.managerCost;
            business.hasManager = true;
            this.render();
            this.saveGameState();
            this.showNotification(`Manager hired for ${business.creatureName}!`);
        }
    }

    getCurrentCost(business) {
        // Cost increases with each purchase
        return Math.floor(business.baseCost * Math.pow(1.15, business.owned));
    }

    getBusinessRevenue(business) {
        // Revenue scales with level and owned count
        return Math.floor(business.baseRevenue * business.owned * (1 + business.level * 0.1));
    }

    getBusinessPerSecond(business) {
        if (business.owned === 0 || !business.hasManager) return 0;
        return Math.floor(this.getBusinessRevenue(business) / business.cycleTime);
    }

    getAffectionPerSecond() {
        return this.creatureBusinesses.reduce((total, business) => {
            return total + this.getBusinessPerSecond(business);
        }, 0);
    }

    getImageUrl(imagePath) {
        if (!imagePath) return '/assets/placeholder.png';
        const storageMode = 'azure'; // You can make this dynamic if needed
        if (storageMode === 'azure') {
            const baseUrl = 'https://chatlingsdevlyg7hq.blob.core.windows.net/artwork';
            return `${baseUrl}/${imagePath}`;
        }
        return `/images/${imagePath}`;
    }

    formatNumber(num) {
        if (num < 1000) return Math.floor(num).toString();
        if (num < 1000000) return (num / 1000).toFixed(1) + 'K';
        if (num < 1000000000) return (num / 1000000).toFixed(1) + 'M';
        return (num / 1000000000).toFixed(1) + 'B';
    }

    showNotification(message) {
        // Use modal system if available
        if (window.ModalManager) {
            window.ModalManager.showInfo('Idle Game', message);
        } else {
            alert(message);
        }
    }
}

// Initialize game
const game = new IdleGame();
game.init();
