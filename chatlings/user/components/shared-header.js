/**
 * Shared Header Component
 * Injects common header HTML and functionality across all user pages
 */

function getPageTitle(activePage) {
    const titles = {
        'home': 'Home',
        'collections': 'Collection',
        'achievements': 'Achievements',
        'integrations': 'Integrations',
        'team': 'Team',
        'chatroom': 'Chatroom',
        'notifications': 'Notifications',
        'settings': 'Settings'
    };
    return titles[activePage] || 'Home';
}

function initSharedHeader(activePage = 'home') {
    const pageTitle = getPageTitle(activePage);

    // Dynamically load modal system if not already loaded
    if (!document.getElementById('modal-css')) {
        const modalCSS = document.createElement('link');
        modalCSS.id = 'modal-css';
        modalCSS.rel = 'stylesheet';
        modalCSS.href = '/user/styles/modal.css';
        document.head.appendChild(modalCSS);
    }

    if (!document.getElementById('modal-js')) {
        const modalJS = document.createElement('script');
        modalJS.id = 'modal-js';
        modalJS.src = '/user/components/modal-manager.js';
        document.head.appendChild(modalJS);
    }

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
                        <div class="dropdown-header" onclick="modalManager.openNotificationsModal(); closeAllDropdowns();" style="cursor: pointer;">
                            Click to view all notifications
                        </div>
                        <div id="notifications-list">
                            <div class="dropdown-empty">Loading notifications...</div>
                        </div>
                        <div class="dropdown-footer" id="mark-all-read-footer" style="display: none;">
                            <button class="mark-all-read-button" onclick="markAllNotificationsAsRead(event)">
                                Mark All as Read
                            </button>
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
                        <div class="dropdown-item" onclick="window.location.href='settings.html'" style="justify-content: center;">
                            <span class="dropdown-item-icon">⚙️</span>
                            <span class="dropdown-item-text">Settings</span>
                        </div>
                        <div class="dropdown-item" onclick="logout()" style="justify-content: center;">
                            <span class="dropdown-item-icon">🚪</span>
                            <span class="dropdown-item-text">Logout</span>
                        </div>
                        <div class="dropdown-item" onclick="showAbandonAccountConfirmation()" style="justify-content: center; color: #dc3545; font-size: 0.85em; padding: 8px 15px; opacity: 0.8;">
                            <span class="dropdown-item-icon" style="font-size: 0.9em;">⚠️</span>
                            <span class="dropdown-item-text">Abandon Account</span>
                        </div>
                    </div>
                </div>
            </div>
        </header>

        <!-- Abandon Account Confirmation Modal -->
        <div id="abandon-account-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; align-items: center; justify-content: center;">
            <div style="background: white; border-radius: 15px; padding: 30px; max-width: 500px; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
                <h2 style="color: #dc3545; margin-bottom: 15px;">⚠️ Abandon Account?</h2>
                <p style="color: #666; margin-bottom: 20px;">
                    This will permanently abandon your current account and start fresh. You will lose:
                </p>
                <ul style="color: #666; margin-bottom: 20px; padding-left: 25px;">
                    <li>All your chatlings</li>
                    <li>Your achievements</li>
                    <li>Conversation history</li>
                    <li>Team assignments</li>
                </ul>
                <div style="margin-bottom: 20px;">
                    <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #333;">
                        Enter your password to confirm:
                    </label>
                    <input
                        type="password"
                        id="abandon-password-input"
                        placeholder="Your password"
                        style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px;"
                    >
                    <div style="font-size: 0.85em; color: #666; margin-top: 5px;">
                        This action requires password verification for security
                    </div>
                </div>
                <div id="abandon-status-message" style="display: none; padding: 12px; border-radius: 8px; margin-bottom: 15px; text-align: center;"></div>
                <div style="display: flex; gap: 15px; justify-content: flex-end;">
                    <button id="abandon-cancel-btn" onclick="hideAbandonAccountConfirmation()" style="padding: 12px 24px; border: 1px solid #ddd; background: white; border-radius: 8px; cursor: pointer; font-size: 16px;">
                        Cancel
                    </button>
                    <button id="abandon-confirm-btn" onclick="confirmAbandonAccount()" style="padding: 12px 24px; border: none; background: #dc3545; color: white; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: bold;">
                        Yes, Abandon Account
                    </button>
                </div>
            </div>
        </div>

        <nav>
            <h1 class="page-title">${pageTitle}</h1>
            <div class="nav-links">
                <a href="index.html" class="nav-link nav-icon ${activePage === 'home' ? 'active' : ''}" title="Home">
                    <img src="/user/assets/home.png" alt="" class="nav-icon-img">
                </a>
                <a href="collections.html" class="nav-link nav-icon ${activePage === 'collections' ? 'active' : ''}" title="Collections">
                    <img src="/user/assets/collections.png" alt="" class="nav-icon-img">
                </a>
                <a href="team.html" class="nav-link nav-icon ${activePage === 'team' ? 'active' : ''}" title="Team">
                    <img src="/user/assets/team.png" alt="" class="nav-icon-img">
                </a>
                <a href="chatroom.html" class="nav-link nav-icon ${activePage === 'chatroom' ? 'active' : ''}" title="Chatroom">
                    <img src="/user/assets/chatroom.png" alt="" class="nav-icon-img">
                </a>
                <a href="achievements.html" class="nav-link nav-icon ${activePage === 'achievements' ? 'active' : ''}" title="Achievements">
                    <img src="/user/assets/achievements.png" alt="" class="nav-icon-img">
                </a>
                <a href="integrations.html" class="nav-link nav-icon ${activePage === 'integrations' ? 'active' : ''}" title="Integrations">
                    <img src="/user/assets/integrations.png" alt="" class="nav-icon-img">
                </a>
                <a href="#" class="nav-link nav-icon" onclick="openGuideModal(); return false;" title="Guide">
                    <img src="/user/assets/guide.png" alt="" class="nav-icon-img">
                </a>
            </div>
        </nav>

        <style>
            .nav-icon {
                min-width: 50px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                padding: 12px 20px !important;
            }
            .nav-icon-img {
                width: 36px;
                height: 36px;
                object-fit: contain;
                transition: transform 0.2s;
            }
            .nav-icon:hover .nav-icon-img {
                transform: scale(1.15);
            }
            .nav-icon.active {
                background: rgba(118, 75, 162, 0.5) !important;
                box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.3) !important;
            }
            #notifications-list {
                max-height: 400px;
                overflow-y: auto;
            }
            .dropdown-footer {
                padding: 10px;
                border-top: 1px solid #eee;
                background: #f9f9f9;
            }
            .mark-all-read-button {
                width: 100%;
                padding: 10px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 0.9em;
                font-weight: 600;
                transition: transform 0.2s, box-shadow 0.2s;
            }
            .mark-all-read-button:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            }
            .mark-all-read-button:disabled {
                background: #ccc;
                cursor: not-allowed;
                transform: none;
            }
        </style>
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

        // Check for notifications to update bell indicator
        await checkNotificationIndicator();
    } catch (error) {
        console.error('Error loading user data for header:', error);
    }
}

async function checkNotificationIndicator() {
    try {
        // Check daily box
        let hasNotifications = false;
        try {
            const dailyBoxResponse = await fetch('/api/daily-box/can-claim');
            if (dailyBoxResponse.ok) {
                const dailyBoxData = await dailyBoxResponse.json();
                if (dailyBoxData.canClaim) {
                    hasNotifications = true;
                }
            }
        } catch (err) {
            console.log('Could not check daily box:', err);
        }

        // Check regular notifications if no daily box
        if (!hasNotifications) {
            const notifResponse = await fetch('/api/user/notifications?limit=1&_=' + Date.now());
            if (notifResponse.ok) {
                const data = await notifResponse.json();
                hasNotifications = (data.notifications || []).length > 0;
            }
        }

        updateBellIndicator(hasNotifications, hasNotifications ? 1 : 0);
    } catch (error) {
        console.error('Error checking notification indicator:', error);
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
                img.src = getImageUrl(member.creature.image);
                img.alt = member.creature.name;
                img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
                img.title = `${member.role}: ${member.creature.name}`;
                icon.appendChild(img);

                // Click to view details (determine current page for back navigation)
                icon.onclick = () => {
                    const currentPage = window.location.pathname.includes('team.html') ? 'team' :
                                       window.location.pathname.includes('index.html') ? 'home' : 'collections';
                    window.location.href = `view-creature.html?id=${member.creature.id}&from=${currentPage}`;
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
    if (emailEl) emailEl.textContent = user.provider_email || '';

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
    console.log('loadRecentNotifications called');
    try {
        // Check daily box first
        let dailyBoxNotification = null;
        try {
            // Check if user has already opened the daily box page today
            const lastOpened = localStorage.getItem('daily-box-opened');
            const today = new Date().toDateString();
            const lastOpenedDate = lastOpened ? new Date(parseInt(lastOpened)).toDateString() : null;

            // Only show notification if not opened today
            if (lastOpenedDate !== today) {
                const dailyBoxResponse = await fetch('/api/daily-box/can-claim');
                if (dailyBoxResponse.ok) {
                    const dailyBoxData = await dailyBoxResponse.json();
                    if (dailyBoxData.canClaim) {
                        dailyBoxNotification = {
                            id: 'daily_box_' + today, // Special ID for daily box
                            type: 'daily_box',
                            message: 'Your daily mystery box is ready to open!',
                            created_at: new Date().toISOString(),
                            link: '/user/daily-box.html'
                        };
                    }
                }
            }
        } catch (err) {
            console.log('Could not check daily box:', err);
        }

        // Load regular notifications (add timestamp to prevent caching)
        const response = await fetch('/api/user/notifications?limit=10&_=' + Date.now());
        if (response.ok) {
            const data = await response.json();
            let notifications = data.notifications || [];

            console.log('Loaded notifications from API:', notifications.length);

            // Prepend daily box notification if available
            if (dailyBoxNotification) {
                notifications = [dailyBoxNotification, ...notifications];
                console.log('Added daily box, total notifications:', notifications.length);
            }

            // Check for duplicates by ID
            const uniqueNotifications = [];
            const seenIds = new Set();
            for (const notif of notifications) {
                if (!seenIds.has(notif.id)) {
                    seenIds.add(notif.id);
                    uniqueNotifications.push(notif);
                } else {
                    console.warn('Duplicate notification detected:', notif.id, notif.message);
                }
            }

            console.log('Unique notifications:', uniqueNotifications.length);
            displayNotifications(uniqueNotifications);
            updateBellIndicator(uniqueNotifications.length > 0, uniqueNotifications.length);

            // Show/hide "Mark All as Read" footer
            const footer = document.getElementById('mark-all-read-footer');
            if (footer) {
                footer.style.display = uniqueNotifications.length > 0 ? 'block' : 'none';
            }
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

    console.log('Displaying notifications:', notifications);

    // Clear container first
    container.innerHTML = '';

    // Create and append each notification element
    notifications.forEach((notif, index) => {
        const notifType = notif.notification_type || notif.type;
        const icon = getNotificationIcon(notifType);
        const timeAgo = formatTimeAgo(notif.created_at);

        // Build link from notification data
        let link = notif.link;

        // Parse metadata for potential use
        let metadata = null;
        try {
            metadata = typeof notif.metadata === 'string' ? JSON.parse(notif.metadata) : notif.metadata;
        } catch (e) {
            console.error('Error parsing notification metadata:', e);
        }

        // For reward_claimed notifications, always ensure showWelcome parameter is added
        if (notifType === 'reward_claimed' && metadata?.creature_id) {
            // If there's already a link to view-creature, add showWelcome parameter
            if (link && link.includes('/user/view-creature.html')) {
                // Check if showWelcome is already in the URL
                if (!link.includes('showWelcome=')) {
                    link += (link.includes('?') ? '&' : '?') + 'showWelcome=true';
                }
            } else {
                // Build new link with showWelcome
                link = `/user/view-creature.html?id=${metadata.creature_id}&showWelcome=true`;
            }
        }
        // If no link but has metadata, try to build link from metadata
        else if (!link || link === '#' || link === null || link === 'null') {
            if (metadata) {
                // For achievement notifications, link to achievements page
                if ((notifType === 'achievement_unlocked' || notifType === 'achievement') && metadata?.achievement_id) {
                    link = '/user/achievements.html';
                }
            }
        }

        const hasLink = link && link !== '#' && link !== null && link !== 'null';

        console.log(`Notification ${index}:`, {
            id: notif.id,
            link: link,
            hasLink,
            message: notif.message,
            metadata: notif.metadata,
            fullNotif: notif
        });

        const notifElement = document.createElement('div');
        notifElement.className = `dropdown-item ${hasLink ? 'notification-clickable' : ''}`;
        notifElement.setAttribute('data-notification-id', notif.id || '');
        notifElement.setAttribute('data-notification-link', link || '');

        // ALWAYS add click handler for debugging
        notifElement.style.cursor = 'pointer';
        notifElement.addEventListener('click', () => {
            console.log('Click event fired for notification:', notif.id, 'hasLink:', hasLink, 'link:', link);
            if (hasLink) {
                handleNotificationClick(notif.id, link);
            } else {
                console.warn('Notification clicked but has no valid link:', notif);
            }
        });

        notifElement.innerHTML = `
            <span class="dropdown-item-icon">${icon}</span>
            <span class="dropdown-item-text">${notif.message}</span>
            <span class="dropdown-item-time">${timeAgo}</span>
        `;

        container.appendChild(notifElement);
    });

    console.log('Notifications rendered, clickable count:', container.querySelectorAll('.notification-clickable').length);
}

async function handleNotificationClick(notificationId, link) {
    console.log('Notification clicked:', { notificationId, link });

    try {
        // Handle daily box notification specially
        if (notificationId && notificationId.toString().startsWith('daily_box_')) {
            console.log('Handling daily box notification');
            // Mark as opened in localStorage so it doesn't show again today
            localStorage.setItem('daily-box-opened', Date.now().toString());
        }
        // Mark regular notification as read
        else if (notificationId && notificationId !== 'undefined' && notificationId !== 'null') {
            console.log('Marking notification as read:', notificationId);
            const response = await fetch('/api/user/notifications/mark-read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationIds: [notificationId] })
            });

            console.log('Mark as read response status:', response.status);
            const responseData = await response.json();
            console.log('Mark as read response:', responseData);

            if (response.ok) {
                console.log('Notification marked as read successfully, reloading notifications...');
                // Reload notifications to update the dropdown
                await loadRecentNotifications();
            } else {
                console.error('Failed to mark notification as read:', responseData);
            }
        }

        // Navigate to link if provided AFTER marking as read completes
        if (link && link !== '' && link !== '#' && link !== 'null' && link !== 'undefined') {
            console.log('Navigating to:', link);
            window.location.href = link;
        } else {
            console.log('No valid link to navigate to:', link);
            // If no link, just close the dropdown
            const dropdown = document.getElementById('notifications-dropdown');
            if (dropdown) {
                dropdown.classList.remove('show');
            }
        }
    } catch (error) {
        console.error('Error handling notification click:', error);
        // Still navigate even if mark-as-read fails
        if (link && link !== '' && link !== '#' && link !== 'null' && link !== 'undefined') {
            window.location.href = link;
        }
    }
}

function getNotificationIcon(type) {
    const icons = {
        'daily_box': '🎁',
        'new_chatling': '🎁',
        'reward_claimed': '✨',
        'daily_visit': '🌟',
        'achievement': '🏆',
        'achievement_unlocked': '🏆',
        'rare_find': '💎',
        'collection_milestone': '📚',
        'youtube_reminder': '🤖',
        'new_conversation': '💬',
        'chatling_runaway': '🏃',
        'chatling_recovered': '🎉'
    };
    return icons[type] || '🔔';
}

function updateBellIndicator(hasNotifications, count = 0) {
    const bellButton = document.querySelector('.bell-button');
    if (!bellButton) return;

    if (hasNotifications && count > 0) {
        // Add ringing animation
        bellButton.classList.add('bell-ringing');

        // Update or create notification badge with count
        let badge = bellButton.querySelector('.notification-badge');
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'notification-badge';
            bellButton.style.position = 'relative';
            bellButton.appendChild(badge);
        }
        badge.textContent = count > 9 ? '9+' : count;
        badge.style.cssText = `
            position: absolute;
            top: -5px;
            right: -5px;
            min-width: 18px;
            height: 18px;
            background: #e74c3c;
            color: white;
            border-radius: 9px;
            border: 2px solid white;
            font-size: 11px;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 4px;
        `;

        // Add animation styles if not already added
        if (!document.getElementById('bell-animation-styles')) {
            const style = document.createElement('style');
            style.id = 'bell-animation-styles';
            style.textContent = `
                @keyframes bellRing {
                    0%, 100% { transform: rotate(0deg); }
                    10%, 30%, 50%, 70%, 90% { transform: rotate(-10deg); }
                    20%, 40%, 60%, 80% { transform: rotate(10deg); }
                }

                .bell-ringing {
                    animation: bellRing 2s ease-in-out infinite;
                    transform-origin: top center;
                }
            `;
            document.head.appendChild(style);
        }
    } else {
        // Remove animation and indicator
        bellButton.classList.remove('bell-ringing');
        const badge = bellButton.querySelector('.notification-badge');
        if (badge) badge.remove();
    }
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

// Abandon Account functions
function showAbandonAccountConfirmation() {
    const modal = document.getElementById('abandon-account-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
    // Close the user dropdown
    const userDropdown = document.getElementById('user-dropdown');
    if (userDropdown) {
        userDropdown.classList.remove('show');
    }
}

function hideAbandonAccountConfirmation() {
    const modal = document.getElementById('abandon-account-modal');
    const statusMsg = document.getElementById('abandon-status-message');
    const confirmBtn = document.getElementById('abandon-confirm-btn');
    const cancelBtn = document.getElementById('abandon-cancel-btn');
    const passwordInput = document.getElementById('abandon-password-input');

    if (modal) {
        modal.style.display = 'none';
    }

    // Reset status message
    if (statusMsg) {
        statusMsg.style.display = 'none';
        statusMsg.textContent = '';
    }

    // Reset password input
    if (passwordInput) {
        passwordInput.value = '';
        passwordInput.disabled = false;
    }

    // Reset buttons
    if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Yes, Abandon Account';
    }
    if (cancelBtn) {
        cancelBtn.disabled = false;
    }
}

async function confirmAbandonAccount() {
    const statusMsg = document.getElementById('abandon-status-message');
    const confirmBtn = document.getElementById('abandon-confirm-btn');
    const cancelBtn = document.getElementById('abandon-cancel-btn');
    const passwordInput = document.getElementById('abandon-password-input');

    const password = passwordInput.value.trim();

    // Disable buttons during processing
    confirmBtn.disabled = true;
    cancelBtn.disabled = true;
    passwordInput.disabled = true;
    confirmBtn.textContent = 'Processing...';

    try {
        const response = await fetch('/api/user/abandon-account', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password })
        });

        if (response.ok) {
            const data = await response.json();

            // Show success message
            statusMsg.style.display = 'block';
            statusMsg.style.background = '#d4edda';
            statusMsg.style.color = '#155724';
            statusMsg.style.border = '1px solid #c3e6cb';
            statusMsg.innerHTML = '✅ Account abandoned! Logging you out...';

            // Redirect to login after 1.5 seconds
            setTimeout(() => {
                window.location.href = '/user/login.html';
            }, 1500);
        } else {
            const error = await response.json();

            // Show error message
            statusMsg.style.display = 'block';
            statusMsg.style.background = '#f8d7da';
            statusMsg.style.color = '#721c24';
            statusMsg.style.border = '1px solid #f5c6cb';
            statusMsg.textContent = 'Error: ' + (error.error || 'Failed to abandon account');

            // Re-enable buttons
            confirmBtn.disabled = false;
            cancelBtn.disabled = false;
            passwordInput.disabled = false;
            confirmBtn.textContent = 'Yes, Abandon Account';
        }
    } catch (error) {
        console.error('Error abandoning account:', error);

        // Show error message
        statusMsg.style.display = 'block';
        statusMsg.style.background = '#f8d7da';
        statusMsg.style.color = '#721c24';
        statusMsg.style.border = '1px solid #f5c6cb';
        statusMsg.textContent = 'Error: Unable to abandon account. Please try again.';

        // Re-enable buttons
        confirmBtn.disabled = false;
        cancelBtn.disabled = false;
        passwordInput.disabled = false;
        confirmBtn.textContent = 'Yes, Abandon Account';
    }
}

// ============================================================================
// Daily Box Notification - Now integrated into bell notifications
// ============================================================================
// Popup notification disabled - daily box now shows in bell dropdown

// ============================================================================
// YouTube Connection Check
// ============================================================================
(function() {
    let lastNotificationTime = localStorage.getItem('last_youtube_reminder');
    const CHECK_INTERVAL = 10 * 60 * 1000; // Check every 10 minutes
    const NOTIFICATION_COOLDOWN = 6 * 60 * 60 * 1000; // Only notify once every 6 hours

    async function checkYouTubeConnection() {
        try {
            const response = await fetch('/api/youtube/token');
            if (!response.ok) return;

            const data = await response.json();

            // If YouTube is not connected, send a notification
            if (!data.connected) {
                const now = Date.now();
                const lastNotif = lastNotificationTime ? parseInt(lastNotificationTime) : 0;

                // Only send notification if cooldown has passed
                if (now - lastNotif > NOTIFICATION_COOLDOWN) {
                    await sendYouTubeReminderNotification();
                    localStorage.setItem('last_youtube_reminder', now.toString());
                    lastNotificationTime = now.toString();
                }
            } else {
                // If connected, clear the last notification time
                localStorage.removeItem('last_youtube_reminder');
                lastNotificationTime = null;
            }
        } catch (error) {
            console.error('Error checking YouTube connection:', error);
        }
    }

    async function sendYouTubeReminderNotification() {
        try {
            const response = await fetch('/api/notifications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: 'youtube_reminder',
                    message: '🤖 Your Community Ambassador is waiting! Connect YouTube to discover new Chatlings from videos you like.',
                    link: '/user/integrations.html'
                })
            });

            if (response.ok) {
                console.log('YouTube reminder notification sent');
            }
        } catch (error) {
            console.error('Error sending YouTube reminder notification:', error);
        }
    }

    // Check immediately on page load
    setTimeout(checkYouTubeConnection, 3000); // Wait 3 seconds for page to load

    // Then check periodically
    setInterval(checkYouTubeConnection, CHECK_INTERVAL);
})();

// Register service worker for PWA support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then((registration) => {
                console.log('ServiceWorker registration successful');
            })
            .catch((err) => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}

// Handle page restoration from bfcache (browser back/forward)
window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        console.log('Page restored from cache, reloading notifications');
        // Page was restored from bfcache, refresh notification indicator
        checkNotificationIndicator();
    }
});

// Mark all notifications as read from dropdown
async function markAllNotificationsAsRead(event) {
    event.stopPropagation(); // Prevent dropdown from closing

    const button = event.target;
    const originalText = button.textContent;

    try {
        button.disabled = true;
        button.textContent = 'Marking as read...';

        const response = await fetch('/api/user/notifications/mark-read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notificationIds: [] }) // Empty array marks all as read
        });

        if (response.ok) {
            console.log('All notifications marked as read');
            // Reload notifications to update the dropdown
            await loadRecentNotifications();

            // Close the dropdown after a brief moment
            setTimeout(() => {
                const dropdown = document.getElementById('notifications-dropdown');
                if (dropdown) {
                    dropdown.classList.remove('show');
                }
            }, 500);
        } else {
            throw new Error('Failed to mark notifications as read');
        }
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        button.disabled = false;
        button.textContent = originalText;
        alert('Failed to mark notifications as read. Please try again.');
    }
}
