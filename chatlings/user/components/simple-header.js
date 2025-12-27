/**
 * Simple Header Component
 * Shows Chatlings logo, team icons, notifications, user menu, and Home button
 */

function initSimpleHeader() {
    const headerHTML = `
        <div class="simple-top-header">
            <div class="header-logo">
                <img src="/assets/icon-192.png" alt="Chatlings">
            </div>

            <div class="header-right" id="header-right" style="display: none;">
                <!-- Motes Display -->
                <div class="motes-display" title="Your Motes - Click to visit Store" onclick="window.location.href='/user/store.html'">
                    <span class="motes-icon">✨</span>
                    <span class="motes-count" id="motes-count">0</span>
                </div>

                <!-- Notifications Dropdown -->
                <div class="dropdown">
                    <button class="bell-button" onclick="toggleNotifications(event)" title="Notifications">
                        🔔
                    </button>
                    <div class="dropdown-content" id="notifications-dropdown">
                        <div class="dropdown-header" onclick="window.location.href='/user/notifications.html';" style="cursor: pointer;">
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

                <!-- User Avatar (opens account modal) -->
                <div class="user-avatar" id="user-avatar" onclick="openAccountModal()" style="cursor: pointer;">?</div>

                <button class="home-button" onclick="window.location.href='/user/index.html'">
                    <span>☰</span>
                </button>
            </div>
        </div>
    `;

    // Insert at beginning of body
    document.body.insertAdjacentHTML('afterbegin', headerHTML);

    // Load account modal files
    loadAccountModalFiles();

    // Load user data and initialize
    loadUserDataForHeader();
}

/**
 * Load account modal CSS and JS files
 */
function loadAccountModalFiles() {
    // Load CSS
    if (!document.getElementById('account-modal-css')) {
        const accountCSS = document.createElement('link');
        accountCSS.id = 'account-modal-css';
        accountCSS.rel = 'stylesheet';
        accountCSS.href = '/user/components/account-modal.css';
        document.head.appendChild(accountCSS);
    }

    // Load JS
    if (!document.getElementById('account-modal-js')) {
        const accountJS = document.createElement('script');
        accountJS.id = 'account-modal-js';
        accountJS.src = '/user/components/account-modal.js';
        document.head.appendChild(accountJS);
    }
}

// Load user data and populate header
async function loadUserDataForHeader() {
    try {
        const response = await fetch('/api/user/me');
        if (response.ok) {
            const user = await response.json();
            updateHeaderUserInfo(user);
        }

        // Check for notifications to update bell indicator
        await checkNotificationIndicator();
    } catch (error) {
        console.error('Error loading user data for header:', error);
    }
}

function updateHeaderUserInfo(user) {
    // Show header right section with user avatar
    const headerRight = document.getElementById('header-right');
    if (headerRight) {
        headerRight.style.display = 'flex';
    }

    const userAvatar = document.getElementById('user-avatar');
    if (userAvatar && user.username) {
        userAvatar.textContent = user.username.charAt(0).toUpperCase();
    }

    // Update motes count
    const motesCount = document.getElementById('motes-count');
    if (motesCount && user.motes !== undefined) {
        motesCount.textContent = user.motes.toLocaleString();
    }
}


async function checkNotificationIndicator() {
    try {
        const notifResponse = await fetch('/api/user/notifications?limit=1&_=' + Date.now());
        if (notifResponse.ok) {
            const data = await notifResponse.json();
            const hasNotifications = (data.notifications || []).length > 0;
            updateBellIndicator(hasNotifications, hasNotifications ? 1 : 0);
        }
    } catch (error) {
        console.error('Error checking notification indicator:', error);
    }
}

function updateBellIndicator(hasNotifications, count = 0) {
    const bellButton = document.querySelector('.bell-button');
    if (!bellButton) return;

    if (hasNotifications && count > 0) {
        bellButton.classList.add('bell-ringing');

        let badge = bellButton.querySelector('.notification-badge');
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'notification-badge';
            bellButton.style.position = 'relative';
            bellButton.appendChild(badge);
        }
        badge.textContent = count > 9 ? '9+' : count;
    } else {
        bellButton.classList.remove('bell-ringing');
        const badge = bellButton.querySelector('.notification-badge');
        if (badge) badge.remove();
    }
}

// Dropdown functions
function toggleNotifications(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('notifications-dropdown');

    if (dropdown) {
        dropdown.classList.toggle('show');
        if (dropdown.classList.contains('show')) {
            loadRecentNotifications();
        }
    }
}

// Close dropdowns when clicking outside
document.addEventListener('click', function(event) {
    const notifDropdown = document.getElementById('notifications-dropdown');
    if (notifDropdown) notifDropdown.classList.remove('show');
});

async function loadRecentNotifications() {
    try {
        const response = await fetch('/api/user/notifications?limit=10&_=' + Date.now());
        if (response.ok) {
            const data = await response.json();
            let notifications = data.notifications || [];
            displayNotifications(notifications);
            updateBellIndicator(notifications.length > 0, notifications.length);

            const footer = document.getElementById('mark-all-read-footer');
            if (footer) {
                footer.style.display = notifications.length > 0 ? 'block' : 'none';
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

    container.innerHTML = '';

    notifications.forEach((notif) => {
        const notifType = notif.notification_type || notif.type;
        const icon = getNotificationIcon(notifType);
        const timeAgo = formatTimeAgo(notif.created_at);
        const link = notif.link;
        const hasLink = link && link !== '#' && link !== null && link !== 'null';

        const notifElement = document.createElement('div');
        notifElement.className = `dropdown-item ${hasLink ? 'notification-clickable' : ''}`;
        notifElement.style.cursor = hasLink ? 'pointer' : 'default';

        if (hasLink) {
            notifElement.addEventListener('click', () => {
                window.location.href = link;
            });
        }

        notifElement.innerHTML = `
            <span class="dropdown-item-icon">${icon}</span>
            <span class="dropdown-item-text">${notif.message}</span>
            <span class="dropdown-item-time">${timeAgo}</span>
        `;

        container.appendChild(notifElement);
    });
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

async function markAllNotificationsAsRead(event) {
    event.stopPropagation();

    const button = event.target;
    const originalText = button.textContent;

    try {
        button.disabled = true;
        button.textContent = 'Marking as read...';

        const response = await fetch('/api/user/notifications/mark-read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notificationIds: [] })
        });

        if (response.ok) {
            await loadRecentNotifications();

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

async function logout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/user/login.html';
    } catch (error) {
        console.error('Error logging out:', error);
        window.location.href = '/user/login.html';
    }
}

// Auto-initialize when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSimpleHeader);
} else {
    initSimpleHeader();
}
