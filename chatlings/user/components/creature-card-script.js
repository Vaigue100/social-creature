/**
 * Creature Card with Traits - Reusable Component Script
 * Functions for rendering and managing creature trait displays
 */

window.renderTraitsVertical = function(traits, baseColor) {
    const container = document.getElementById('traits-container');

    // Clear loading state
    const imgLoading = document.getElementById('image-loading');
    if (imgLoading) {
        imgLoading.style.display = 'none';
    }

    // Clear container
    container.innerHTML = '';
    container.style.display = 'flex';

    // Parse base color or use default
    const color = baseColor || '#667eea';

    // Apply unified gradient background to the entire column
    const columnGradient = createColumnGradient(color);
    container.style.background = columnGradient;

    // Sort by category order
    const sortedTraits = [...traits].sort((a, b) => a.category_id - b.category_id);

    sortedTraits.forEach((trait, index) => {
        const badge = document.createElement('div');
        badge.className = 'trait-badge-horizontal';

        // Add tooltip
        badge.setAttribute('data-tooltip', trait.description);

        badge.innerHTML = `
            <div class="trait-left">
                <span class="trait-icon">${trait.icon}</span>
                <span class="trait-name">${trait.category_name}</span>
            </div>
            <span class="trait-score">${trait.score}</span>
        `;

        container.appendChild(badge);
    });

    // Set up resize observer to toggle compact mode
    setupResizeObserver();
};

function createColumnGradient(baseColor) {
    // Convert hex to RGB
    const hex = baseColor.replace('#', '');
    let r = parseInt(hex.substr(0, 2), 16);
    let g = parseInt(hex.substr(2, 2), 16);
    let b = parseInt(hex.substr(4, 2), 16);

    // Create gradient from lighter to darker
    const r1 = Math.min(255, Math.round(r * 1.2));
    const g1 = Math.min(255, Math.round(g * 1.2));
    const b1 = Math.min(255, Math.round(b * 1.2));

    const r2 = Math.max(0, Math.round(r * 0.7));
    const g2 = Math.max(0, Math.round(g * 0.7));
    const b2 = Math.max(0, Math.round(b * 0.7));

    return `linear-gradient(180deg, rgb(${r1}, ${g1}, ${b1}) 0%, rgb(${r2}, ${g2}, ${b2}) 100%)`;
}

function setupResizeObserver() {
    const img = document.getElementById('creature-image');
    const traitsColumn = document.getElementById('traits-container');

    if (!img || !traitsColumn) return;

    let debounceTimer = null;
    let lastMode = null;

    // Check and update badge display mode
    function checkBadgeSize() {
        const imgWidth = img.offsetWidth;
        const badges = traitsColumn.querySelectorAll('.trait-badge-horizontal');

        // Get the current column width based on whether it's in compact mode
        const isCurrentlyCompact = traitsColumn.classList.contains('compact-mode');
        const currentTraitsWidth = isCurrentlyCompact ? 105 : 210; // Use actual widths

        // Calculate ratio based on actual widths
        const ratio = currentTraitsWidth / imgWidth;

        // Use hysteresis to prevent flickering
        let shouldBeCompact;
        if (isCurrentlyCompact) {
            // Harder to exit compact mode - need to be under 40%
            shouldBeCompact = ratio > 0.4;
        } else {
            // Easier to enter compact mode - over 50%
            shouldBeCompact = ratio > 0.5;
        }

        // Only update if mode changed
        if (shouldBeCompact !== isCurrentlyCompact && shouldBeCompact !== lastMode) {
            lastMode = shouldBeCompact;

            badges.forEach(badge => {
                if (shouldBeCompact) {
                    badge.classList.add('compact');
                } else {
                    badge.classList.remove('compact');
                }
            });

            if (shouldBeCompact) {
                traitsColumn.classList.add('compact-mode');
            } else {
                traitsColumn.classList.remove('compact-mode');
            }
        }
    }

    // Debounced check
    function debouncedCheck() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(checkBadgeSize, 100);
    }

    // Check on window resize
    window.addEventListener('resize', debouncedCheck);

    // Initial check
    setTimeout(checkBadgeSize, 200);

    // Also check when image loads
    img.addEventListener('load', () => {
        setTimeout(checkBadgeSize, 100);
    });
}
