/**
 * Shared Header Component
 * Injects common header HTML and functionality across all user pages
 */

// Store current creature ID for modal
let currentCreatureId = null;

function getPageTitle(activePage) {
    const titles = {
        'home': 'Home',
        'collections': 'Collection',
        'achievements': 'Achievements',
        'integrations': 'Integrations',
        'team': 'Team'
    };
    return titles[activePage] || 'Home';
}

function initSharedHeader(activePage = 'home') {
    const pageTitle = getPageTitle(activePage);

    const headerHTML = `
        <header>
            <div class="header-left">
                <img src="/assets/logo.png" alt="Chatlings Logo" class="logo" onerror="this.style.display='none'">
            </div>
            <div class="header-right" id="header-right" style="display: none;">
                <!-- Team Icons -->
                <div class="team-icons" id="team-icons" style="display: flex; gap: 8px; margin-right: 15px;">
                    <!-- Team icons will be populated here -->
                </div>

                <!-- Notifications Dropdown -->
                <div class="dropdown">
                    <button class="bell-button" onclick="toggleNotifications(event)" title="Notifications">
                        🔔
                    </button>
                    <div class="dropdown-content" id="notifications-dropdown">
                        <div class="dropdown-header" onclick="window.location.href='notifications.html'">
                            Click to open Notifications page
                        </div>
                        <div id="notifications-list">
                            <div class="dropdown-empty">Loading notifications...</div>
                        </div>
                    </div>
                </div>

                <!-- User Info Dropdown -->
                <div class="dropdown">
                    <div class="user-avatar" id="user-avatar" onclick="toggleUserMenu(event)">?</div>
                    <div class="dropdown-content" id="user-dropdown" style="min-width: 250px;">
                        <div style="padding: 20px; text-align: center; border-bottom: 1px solid #eee;">
                            <div style="font-size: 1.5em; margin-bottom: 5px;">👤</div>
                            <div style="font-weight: bold; color: #667eea; font-size: 1.1em; margin-bottom: 5px;" id="user-dropdown-name">User</div>
                            <div style="color: #999; font-size: 0.85em;" id="user-dropdown-email">user@example.com</div>
                        </div>
                        <div style="padding: 15px; text-align: center; border-bottom: 1px solid #eee;">
                            <div style="font-size: 0.9em; color: #666; margin-bottom: 8px;">Member since</div>
                            <div style="font-weight: 600; color: #333;" id="user-dropdown-joined">-</div>
                        </div>
                        <div style="padding: 15px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; border-bottom: 1px solid #eee;">
                            <div style="text-align: center;">
                                <div style="font-size: 1.3em; font-weight: bold; color: #667eea;" id="user-dropdown-chatlings">0</div>
                                <div style="font-size: 0.75em; color: #999;">Chatlings</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="font-size: 1.3em; font-weight: bold; color: #667eea;" id="user-dropdown-achievements">0</div>
                                <div style="font-size: 0.75em; color: #999;">Achievements</div>
                            </div>
                        </div>
                        <div class="dropdown-item" onclick="logout()" style="justify-content: center;">
                            <span class="dropdown-item-icon">🚪</span>
                            <span class="dropdown-item-text">Logout</span>
                        </div>
                    </div>
                </div>
            </div>
        </header>

        <nav>
            <h1 class="page-title">${pageTitle}</h1>
            <div class="nav-links">
                <a href="index.html" class="nav-link ${activePage === 'home' ? 'active' : ''}">Home</a>
                <a href="collections.html" class="nav-link ${activePage === 'collections' ? 'active' : ''}">Collections</a>
                <a href="team.html" class="nav-link ${activePage === 'team' ? 'active' : ''}">Team</a>
                <a href="achievements.html" class="nav-link ${activePage === 'achievements' ? 'active' : ''}">Achievements</a>
                <a href="integrations.html" class="nav-link ${activePage === 'integrations' ? 'active' : ''}">Integrations</a>
                <a href="#" class="nav-link" onclick="openGuideModal(); return false;">Guide</a>
            </div>
        </nav>
    `;

    // Insert header at the beginning of container
    const container = document.querySelector('.container');
    if (container) {
        container.insertAdjacentHTML('afterbegin', headerHTML);
    }

    // Load user data
    loadUserDataForHeader();
}

async function loadUserDataForHeader() {
    try {
        const response = await fetch('/api/user/me');
        if (response.ok) {
            const user = await response.json();
            updateHeaderUserInfo(user);
        }

        // Load team icons
        await loadTeamIcons();
    } catch (error) {
        console.error('Error loading user data for header:', error);
    }
}

async function loadTeamIcons() {
    try {
        const response = await fetch('/api/user/team');
        if (!response.ok) return;

        const data = await response.json();
        const teamIconsContainer = document.getElementById('team-icons');
        if (!teamIconsContainer) return;

        teamIconsContainer.innerHTML = '';

        data.team.forEach((member, index) => {
            const icon = document.createElement('div');
            icon.style.cssText = `
                width: 45px;
                height: 45px;
                border-radius: 8px;
                overflow: hidden;
                border: 2px solid ${member.creature ? '#667eea' : '#ddd'};
                cursor: pointer;
                transition: transform 0.2s, box-shadow 0.2s;
                background: ${member.creature ? 'white' : '#f5f5f5'};
                display: flex;
                align-items: center;
                justify-content: center;
            `;

            icon.onmouseover = () => {
                icon.style.transform = 'scale(1.1)';
                icon.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
            };

            icon.onmouseout = () => {
                icon.style.transform = 'scale(1)';
                icon.style.boxShadow = 'none';
            };

            if (member.creature) {
                const img = document.createElement('img');
                img.src = `/images/${member.creature.image}`;
                img.alt = member.creature.name;
                img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
                img.title = `${member.role}: ${member.creature.name}`;
                icon.appendChild(img);

                // Click to view details
                icon.onclick = () => {
                    if (typeof openChatlingModal === 'function') {
                        window.location.href = `collections.html?creature=${member.creature.id}`;
                    }
                };
            } else {
                icon.textContent = '?';
                icon.style.color = '#999';
                icon.style.fontSize = '1.5em';
                icon.title = `${member.role}: Empty slot`;

                // Click to go to team page
                icon.onclick = () => {
                    window.location.href = 'team.html';
                };
            }

            teamIconsContainer.appendChild(icon);
        });

    } catch (error) {
        console.error('Error loading team icons:', error);
    }
}

function updateHeaderUserInfo(user) {
    // Store user data globally for dropdown
    window.currentUserData = user;

    // Show header right section with user avatar
    const headerRight = document.getElementById('header-right');
    if (headerRight) {
        headerRight.style.display = 'flex';
    }

    const userAvatar = document.getElementById('user-avatar');
    if (userAvatar && user.username) {
        userAvatar.textContent = user.username.charAt(0).toUpperCase();
    }

    // Update current chatling display in header
    if (user.currentChatling) {
        const chatling = user.currentChatling;
        currentCreatureId = chatling.id; // Store for modal

        // Show mini chatling card
        const miniCard = document.getElementById('current-chatling-mini');
        if (miniCard) {
            miniCard.style.display = 'flex';
        }

        const chatlingImageMini = document.getElementById('chatling-image-mini');
        const chatlingNameMini = document.getElementById('chatling-name-mini');
        const chatlingRarityMini = document.getElementById('chatling-rarity-mini');

        if (chatlingImageMini) chatlingImageMini.src = `/images/${chatling.image}`;
        if (chatlingNameMini) chatlingNameMini.textContent = chatling.shortName || chatling.name;
        if (chatlingRarityMini) chatlingRarityMini.textContent = chatling.rarityTier || 'Unknown';
    }
}

// Dropdown functions
function toggleNotifications(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('notifications-dropdown');
    const userDropdown = document.getElementById('user-dropdown');

    if (userDropdown) userDropdown.classList.remove('show');
    if (dropdown) {
        dropdown.classList.toggle('show');
        if (dropdown.classList.contains('show')) {
            loadRecentNotifications();
        }
    }
}

function toggleUserMenu(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('user-dropdown');
    const notifDropdown = document.getElementById('notifications-dropdown');

    if (notifDropdown) notifDropdown.classList.remove('show');
    if (dropdown) {
        dropdown.classList.toggle('show');
        if (dropdown.classList.contains('show') && window.currentUserData) {
            updateUserDropdown(window.currentUserData);
        }
    }
}

function updateUserDropdown(user) {
    const nameEl = document.getElementById('user-dropdown-name');
    const emailEl = document.getElementById('user-dropdown-email');
    const joinedEl = document.getElementById('user-dropdown-joined');

    if (nameEl) nameEl.textContent = user.username || 'User';
    if (emailEl) emailEl.textContent = user.email || '';

    if (joinedEl && user.created_at) {
        const date = new Date(user.created_at);
        const formatted = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        joinedEl.textContent = formatted;
    }

    if (window.currentUserStats) {
        const chatlingsEl = document.getElementById('user-dropdown-chatlings');
        const achievementsEl = document.getElementById('user-dropdown-achievements');

        if (chatlingsEl) chatlingsEl.textContent = window.currentUserStats.total_rewards || 0;
        if (achievementsEl) achievementsEl.textContent = window.currentUserStats.total_achievements || 0;
    }
}

// Close dropdowns when clicking outside
document.addEventListener('click', function(event) {
    const notifDropdown = document.getElementById('notifications-dropdown');
    const userDropdown = document.getElementById('user-dropdown');

    if (notifDropdown) notifDropdown.classList.remove('show');
    if (userDropdown) userDropdown.classList.remove('show');
});

async function loadRecentNotifications() {
    try {
        const response = await fetch('/api/user/notifications?limit=10');
        if (response.ok) {
            const notifications = await response.json();
            displayNotifications(notifications);
        } else {
            const list = document.getElementById('notifications-list');
            if (list) {
                list.innerHTML = '<div class="dropdown-empty">Failed to load notifications</div>';
            }
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
        const list = document.getElementById('notifications-list');
        if (list) {
            list.innerHTML = '<div class="dropdown-empty">Error loading notifications</div>';
        }
    }
}

function displayNotifications(notifications) {
    const container = document.getElementById('notifications-list');
    if (!container) return;

    if (notifications.length === 0) {
        container.innerHTML = '<div class="dropdown-empty">No notifications yet</div>';
        return;
    }

    container.innerHTML = notifications.map(notif => {
        const icon = getNotificationIcon(notif.type);
        const timeAgo = formatTimeAgo(notif.created_at);

        return `
            <div class="dropdown-item">
                <span class="dropdown-item-icon">${icon}</span>
                <span class="dropdown-item-text">${notif.message}</span>
                <span class="dropdown-item-time">${timeAgo}</span>
            </div>
        `;
    }).join('');
}

function getNotificationIcon(type) {
    const icons = {
        'new_chatling': '🎁',
        'daily_visit': '🌟',
        'achievement': '🏆',
        'rare_find': '💎',
        'collection_milestone': '📚'
    };
    return icons[type] || '🔔';
}

function formatTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
}

async function logout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/user/login.html';
    } catch (error) {
        console.error('Error logging out:', error);
        window.location.href = '/user/login.html';
    }
}

// Stub for guide modal (will be defined on pages that need it)
function openGuideModal() {
    window.location.href = 'index.html#guide';
}

// Stub for chatling modal (will be defined on pages that need it)
function openChatlingModal() {
    window.location.href = `view-chatling.html?id=${currentCreatureId}`;
}
