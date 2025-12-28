/**
 * Attitude Settings Component
 * Manages chatroom attitude selection with real-time glow preview
 */

let attitudeState = {
    chatroomId: null,
    creatures: [],
    selectedCreatureId: null,
    enthusiasm: 5,
    criticism: 5,
    humor: 5,
    videoContext: null,
    optimalRanges: null,
    estimatedGlow: null,
    onConfirm: null
};

/**
 * Open attitude settings modal
 */
async function openAttitudeSettings(chatroomId, onConfirm) {
    attitudeState.chatroomId = chatroomId;
    attitudeState.onConfirm = onConfirm;

    // Show modal
    const modal = document.getElementById('attitude-settings-modal');
    modal.style.display = 'flex';

    // Load creatures and chatroom info
    await loadCreatures();
    await loadChatroomInfo(chatroomId);
}

/**
 * Close attitude settings modal
 */
function closeAttitudeSettings() {
    const modal = document.getElementById('attitude-settings-modal');
    modal.style.display = 'none';

    // Reset state
    attitudeState = {
        chatroomId: null,
        creatures: [],
        selectedCreatureId: null,
        enthusiasm: 5,
        criticism: 5,
        humor: 5,
        videoContext: null,
        optimalRanges: null,
        estimatedGlow: null,
        onConfirm: null
    };
}

/**
 * Load user's creatures
 */
async function loadCreatures() {
    try {
        const response = await fetch('/api/user/creatures');
        if (!response.ok) {
            throw new Error('Failed to load creatures');
        }

        const data = await response.json();
        attitudeState.creatures = data.creatures || [];

        // Populate creature selector
        const select = document.getElementById('attitude-creature-select');
        if (attitudeState.creatures.length === 0) {
            select.innerHTML = '<option value="">No creatures available</option>';
        } else {
            select.innerHTML = attitudeState.creatures.map(creature => `
                <option value="${creature.id}">${creature.creature_name}</option>
            `).join('');

            // Auto-select first creature
            attitudeState.selectedCreatureId = attitudeState.creatures[0].id;
            select.value = attitudeState.selectedCreatureId;
        }

    } catch (error) {
        console.error('Error loading creatures:', error);
        const select = document.getElementById('attitude-creature-select');
        select.innerHTML = '<option value="">Error loading creatures</option>';
    }
}

/**
 * Load chatroom information
 */
async function loadChatroomInfo(chatroomId) {
    try {
        const response = await fetch(`/api/chatroom/schedules/${chatroomId}`);
        if (!response.ok) {
            throw new Error('Failed to load chatroom info');
        }

        const data = await response.json();
        const schedule = data.schedule;

        // Store video context
        attitudeState.videoContext = {
            category: schedule.video_category,
            subcategory: schedule.video_subcategory
        };

        // Display video info
        const videoContextBox = document.getElementById('video-context-box');
        const videoTitle = document.getElementById('video-title');
        const videoCategory = document.getElementById('video-category');
        const videoHint = document.getElementById('video-hint');

        videoTitle.textContent = schedule.video_title || 'Chatroom';
        videoCategory.textContent = formatCategory(schedule.video_category);
        videoHint.textContent = schedule.hint || '';

        videoContextBox.style.display = 'block';

        // Display optimal ranges
        if (schedule.optimal_enthusiasm_min) {
            attitudeState.optimalRanges = {
                enthusiasm: { min: schedule.optimal_enthusiasm_min, max: schedule.optimal_enthusiasm_max },
                criticism: { min: schedule.optimal_criticism_min, max: schedule.optimal_criticism_max },
                humor: { min: schedule.optimal_humor_min, max: schedule.optimal_humor_max }
            };

            const optimalRangesDiv = document.getElementById('optimal-ranges');
            document.getElementById('optimal-enthusiasm').textContent =
                `${schedule.optimal_enthusiasm_min}-${schedule.optimal_enthusiasm_max}`;
            document.getElementById('optimal-criticism').textContent =
                `${schedule.optimal_criticism_min}-${schedule.optimal_criticism_max}`;
            document.getElementById('optimal-humor').textContent =
                `${schedule.optimal_humor_min}-${schedule.optimal_humor_max}`;

            optimalRangesDiv.style.display = 'block';
        }

        // Calculate initial glow estimate
        await updateGlowPreview();

    } catch (error) {
        console.error('Error loading chatroom info:', error);
    }
}

/**
 * Handle creature selection change
 */
function onCreatureChange() {
    const select = document.getElementById('attitude-creature-select');
    attitudeState.selectedCreatureId = select.value;

    // Could load saved attitudes for this creature here
    updateGlowPreview();
}

/**
 * Handle slider changes
 */
function onSliderChange() {
    // Update values from sliders
    attitudeState.enthusiasm = parseInt(document.getElementById('enthusiasm-slider').value);
    attitudeState.criticism = parseInt(document.getElementById('criticism-slider').value);
    attitudeState.humor = parseInt(document.getElementById('humor-slider').value);

    // Update display values
    document.getElementById('enthusiasm-value').textContent = attitudeState.enthusiasm;
    document.getElementById('criticism-value').textContent = attitudeState.criticism;
    document.getElementById('humor-value').textContent = attitudeState.humor;

    // Reset preset selector
    document.getElementById('preset-select').value = '';

    // Update glow preview
    updateGlowPreview();
}

/**
 * Handle preset selection
 */
function onPresetSelect() {
    const select = document.getElementById('preset-select');
    const preset = select.value;

    if (!preset) return;

    const presets = {
        enthusiastic: { enthusiasm: 10, criticism: 1, humor: 8 },
        critical: { enthusiasm: 3, criticism: 10, humor: 4 },
        humorous: { enthusiasm: 7, criticism: 2, humor: 10 },
        balanced: { enthusiasm: 5, criticism: 5, humor: 5 }
    };

    if (presets[preset]) {
        attitudeState.enthusiasm = presets[preset].enthusiasm;
        attitudeState.criticism = presets[preset].criticism;
        attitudeState.humor = presets[preset].humor;

        // Update sliders and displays
        document.getElementById('enthusiasm-slider').value = attitudeState.enthusiasm;
        document.getElementById('criticism-slider').value = attitudeState.criticism;
        document.getElementById('humor-slider').value = attitudeState.humor;

        document.getElementById('enthusiasm-value').textContent = attitudeState.enthusiasm;
        document.getElementById('criticism-value').textContent = attitudeState.criticism;
        document.getElementById('humor-value').textContent = attitudeState.humor;

        // Update glow preview
        updateGlowPreview();
    }
}

/**
 * Update glow preview
 */
async function updateGlowPreview() {
    if (!attitudeState.chatroomId) return;

    try {
        const response = await fetch('/api/chatroom/calculate-glow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chatroomId: attitudeState.chatroomId,
                enthusiasm: attitudeState.enthusiasm,
                criticism: attitudeState.criticism,
                humor: attitudeState.humor
            })
        });

        if (!response.ok) {
            throw new Error('Failed to calculate glow');
        }

        const data = await response.json();
        attitudeState.estimatedGlow = data.estimatedGlow;

        // Update display
        const glowNumber = document.getElementById('estimated-glow').querySelector('.glow-number');
        glowNumber.textContent = data.estimatedGlow >= 0 ? `+${data.estimatedGlow}` : data.estimatedGlow;

        // Update breakdown
        if (data.breakdown) {
            document.getElementById('breakdown-base').textContent = `+${data.breakdown.base}`;
            document.getElementById('breakdown-match').textContent =
                data.breakdown.matchBonus >= 0 ? `+${data.breakdown.matchBonus.toFixed(1)}` : data.breakdown.matchBonus.toFixed(1);
            document.getElementById('breakdown-extremism').textContent =
                data.breakdown.extremismPenalty > 0 ? `-${data.breakdown.extremismPenalty}` : '0';
            document.getElementById('breakdown-variety').textContent =
                data.breakdown.varietyBonus >= 0 ? `+${data.breakdown.varietyBonus}` : data.breakdown.varietyBonus;

            document.getElementById('glow-breakdown').style.display = 'block';
        }

        // Color code the glow value
        if (data.estimatedGlow >= 7) {
            glowNumber.style.color = '#4ade80'; // Green
        } else if (data.estimatedGlow >= 4) {
            glowNumber.style.color = '#fbbf24'; // Yellow
        } else if (data.estimatedGlow >= 0) {
            glowNumber.style.color = '#f97316'; // Orange
        } else {
            glowNumber.style.color = '#ef4444'; // Red
        }

    } catch (error) {
        console.error('Error calculating glow:', error);
    }
}

/**
 * Save custom preset
 */
async function saveCustomPreset() {
    const name = prompt('Enter a name for this preset:');
    if (!name) return;

    if (!attitudeState.selectedCreatureId) {
        alert('Please select a creature first');
        return;
    }

    try {
        const response = await fetch('/api/chatroom/attitudes/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                creatureId: attitudeState.selectedCreatureId,
                attitudeName: name,
                enthusiasm: attitudeState.enthusiasm,
                criticism: attitudeState.criticism,
                humor: attitudeState.humor
            })
        });

        if (!response.ok) {
            throw new Error('Failed to save preset');
        }

        alert('Preset saved successfully!');

    } catch (error) {
        console.error('Error saving preset:', error);
        alert('Failed to save preset. Please try again.');
    }
}

/**
 * Confirm attitude and participate
 */
async function confirmAttitude() {
    if (!attitudeState.selectedCreatureId) {
        alert('Please select a creature');
        return;
    }

    if (attitudeState.onConfirm) {
        attitudeState.onConfirm({
            creatureId: attitudeState.selectedCreatureId,
            enthusiasm: attitudeState.enthusiasm,
            criticism: attitudeState.criticism,
            humor: attitudeState.humor,
            estimatedGlow: attitudeState.estimatedGlow
        });
    }

    closeAttitudeSettings();
}

/**
 * Format category name
 */
function formatCategory(category) {
    const categoryNames = {
        'MUSIC': 'Music',
        'COMEDY': 'Comedy',
        'GAMING': 'Gaming',
        'ENTERTAINMENT': 'Entertainment',
        'REVIEW': 'Review',
        'EDUCATION': 'Education',
        'SCIENCE_TECH': 'Science & Tech',
        'HOWTO_STYLE': 'How-To & Style',
        'NEWS_POLITICS': 'News & Politics',
        'PEOPLE_BLOGS': 'People & Blogs',
        'DRAMA': 'Drama',
        'INSPIRATIONAL': 'Inspirational',
        'TUTORIAL': 'Tutorial',
        'SPORTS': 'Sports',
        'TRAVEL_EVENTS': 'Travel & Events',
        'PETS_ANIMALS': 'Pets & Animals',
        'GENERAL': 'General'
    };
    return categoryNames[category] || category;
}
