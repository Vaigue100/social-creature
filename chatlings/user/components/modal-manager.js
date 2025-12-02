/**
 * Universal Modal Manager
 * Handles modals/popups that preserve page state when opened/closed
 */

class ModalManager {
    constructor() {
        this.currentModal = null;
        this.savedScrollPosition = 0;
        this.pageState = {};
        this.init();
    }

    init() {
        // Create modal container if it doesn't exist
        if (!document.getElementById('modal-overlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'modal-overlay';
            overlay.className = 'modal-overlay';
            overlay.innerHTML = `
                <div class="modal-container">
                    <div class="modal-header">
                        <h2 class="modal-title"></h2>
                        <button class="modal-close" onclick="modalManager.closeModal()">×</button>
                    </div>
                    <div class="modal-content"></div>
                </div>
            `;
            document.body.appendChild(overlay);

            // Close on overlay click
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.closeModal();
                }
            });

            // Close on escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.currentModal) {
                    this.closeModal();
                }
            });
        }
    }

    /**
     * Save current page state before opening modal
     */
    savePageState() {
        this.savedScrollPosition = window.scrollY;

        // Save any form inputs
        const inputs = document.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (input.id) {
                this.pageState[input.id] = input.value;
            }
        });

        // Save current filter/search states
        const filterInputs = document.querySelectorAll('[data-filter]');
        filterInputs.forEach(input => {
            if (input.id) {
                this.pageState[input.id] = input.value;
            }
        });
    }

    /**
     * Restore page state after closing modal
     */
    restorePageState() {
        // Restore scroll position
        window.scrollTo(0, this.savedScrollPosition);

        // Restore form inputs
        Object.keys(this.pageState).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.value = this.pageState[id];
                // Trigger change event to update any filters
                element.dispatchEvent(new Event('change'));
                element.dispatchEvent(new Event('input'));
            }
        });
    }

    /**
     * Open a modal with custom content
     */
    openModal(title, contentHtml, options = {}) {
        this.savePageState();

        const overlay = document.getElementById('modal-overlay');
        const titleEl = overlay.querySelector('.modal-title');
        const contentEl = overlay.querySelector('.modal-content');

        titleEl.textContent = title;
        contentEl.innerHTML = contentHtml;

        // Apply custom styles if provided
        if (options.width) {
            overlay.querySelector('.modal-container').style.maxWidth = options.width;
        }

        // Show modal
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        this.currentModal = { title, contentHtml, options };
    }

    /**
     * Close the current modal
     */
    closeModal() {
        const overlay = document.getElementById('modal-overlay');
        overlay.classList.remove('active');
        document.body.style.overflow = '';

        this.currentModal = null;

        // Restore page state after a small delay to ensure DOM is ready
        setTimeout(() => {
            this.restorePageState();
        }, 100);
    }

    /**
     * Open notifications modal
     */
    async openNotificationsModal() {
        this.openModal('Notifications', '<div style="text-align: center; padding: 40px;">Loading notifications...</div>', { width: '800px' });

        try {
            const response = await fetch('/api/user/notifications?all=true&limit=100');
            if (!response.ok) throw new Error('Failed to load notifications');

            const data = await response.json();
            const notifications = data.notifications || [];

            let contentHtml;
            if (notifications.length === 0) {
                contentHtml = `
                    <div style="text-align: center; padding: 60px 20px; color: #999;">
                        <div style="font-size: 4em; margin-bottom: 20px;">🔔</div>
                        <h3 style="color: #666; margin-bottom: 10px;">No Notifications</h3>
                        <p>You're all caught up!</p>
                    </div>
                `;
            } else {
                const hasUnread = notifications.some(n => !n.is_read);
                const markAllButton = hasUnread ? `
                    <button onclick="modalManager.markAllNotificationsRead()"
                            class="mark-all-btn"
                            style="margin-bottom: 20px; padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        Mark All as Read
                    </button>
                ` : '';

                contentHtml = `
                    ${markAllButton}
                    <div class="notifications-list">
                        ${notifications.map(n => this.renderNotification(n)).join('')}
                    </div>
                `;
            }

            document.querySelector('#modal-overlay .modal-content').innerHTML = contentHtml;
        } catch (error) {
            console.error('Error loading notifications:', error);
            document.querySelector('#modal-overlay .modal-content').innerHTML = `
                <div style="text-align: center; padding: 40px; color: #e74c3c;">
                    Failed to load notifications. Please try again.
                </div>
            `;
        }
    }

    renderNotification(notification) {
        const isUnread = !notification.is_read;
        const icon = this.getNotificationIcon(notification.notification_type);
        const typeLabel = this.getTypeLabel(notification.notification_type);
        const timeAgo = this.getTimeAgo(new Date(notification.created_at));
        const hasLink = notification.link && notification.link !== '#';

        return `
            <div class="notification-item ${isUnread ? 'unread' : ''} ${hasLink ? 'clickable' : ''}"
                 data-notification-id="${notification.id}"
                 ${hasLink ? `onclick="modalManager.handleNotificationClick('${notification.id}', '${notification.link}')"` : ''}>
                <div class="notification-header">
                    <div class="notification-left">
                        <div class="notification-icon-type">
                            <span class="notification-icon">${icon}</span>
                            <span class="notification-type">${typeLabel}</span>
                        </div>
                        ${notification.title ? `<div class="notification-title">${notification.title}</div>` : ''}
                        <div class="notification-message">${notification.message}</div>
                    </div>
                    <div>
                        <div class="notification-time">${timeAgo}</div>
                        <span class="notification-status ${isUnread ? 'unread' : 'read'}">
                            ${isUnread ? 'New' : 'Read'}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }

    async handleNotificationClick(notificationId, link) {
        try {
            // Mark as read
            await fetch('/api/user/notifications/mark-read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationIds: [notificationId] })
            });

            // Close modal and navigate
            this.closeModal();

            if (link && link !== '' && link !== '#') {
                // Small delay to ensure modal closes smoothly
                setTimeout(() => {
                    window.location.href = link;
                }, 150);
            }
        } catch (error) {
            console.error('Error handling notification:', error);
            this.closeModal();
            if (link && link !== '' && link !== '#') {
                window.location.href = link;
            }
        }
    }

    async markAllNotificationsRead() {
        const btn = document.querySelector('.mark-all-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Marking as read...';
        }

        try {
            await fetch('/api/user/notifications/mark-read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationIds: [] })
            });

            // Reload notifications in modal
            await this.openNotificationsModal();
        } catch (error) {
            console.error('Error marking all as read:', error);
            alert('Failed to mark notifications as read');
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Mark All as Read';
            }
        }
    }

    getNotificationIcon(type) {
        const icons = {
            'daily_box': '🎁',
            'new_chatling': '🎁',
            'daily_visit': '🌟',
            'achievement': '🏆',
            'achievement_unlocked': '🏆',
            'rare_find': '💎',
            'collection_milestone': '📚',
            'youtube_reminder': '🤖',
            'reward_claimed': '✨',
            'new_conversation': '💬',
            'chatling_runaway': '🏃',
            'chatling_recovered': '🎉'
        };
        return icons[type] || '📢';
    }

    getTypeLabel(type) {
        const labels = {
            'daily_box': 'Daily Box',
            'new_chatling': 'New Chatling',
            'daily_visit': 'Daily Visit',
            'achievement': 'Achievement',
            'achievement_unlocked': 'Achievement',
            'rare_find': 'Rare Find',
            'collection_milestone': 'Collection',
            'youtube_reminder': 'YouTube',
            'reward_claimed': 'Reward',
            'new_conversation': 'Conversation',
            'chatling_runaway': 'Alert',
            'chatling_recovered': 'Good News'
        };
        return labels[type] || 'Notification';
    }

    getTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    }
}

// Initialize global modal manager
const modalManager = new ModalManager();
