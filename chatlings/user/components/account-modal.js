/**
 * Account Modal Component
 * Displays user account information, avatar, stats, and settings
 * Replaces the dropdown menu with a centered modal
 */

// Account modal state
let accountModalData = null;

/**
 * Open the account modal
 */
window.openAccountModal = function() {
  const modal = document.getElementById('account-modal');
  if (modal) {
    modal.classList.add('active');
    loadAccountData();
  }
};

/**
 * Close the account modal
 */
function closeAccountModal() {
  const modal = document.getElementById('account-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

/**
 * Load user account data from API
 */
async function loadAccountData() {
  try {
    // Fetch user data
    const userResponse = await fetch('/api/user/me');
    if (!userResponse.ok) throw new Error('Failed to load user data');
    const user = await userResponse.json();

    // Fetch avatar
    const avatarResponse = await fetch('/api/user/avatar/current');
    if (!avatarResponse.ok) throw new Error('Failed to load avatar');
    const avatar = await avatarResponse.json();

    // Fetch stats
    const statsResponse = await fetch('/api/user/stats');
    if (!statsResponse.ok) throw new Error('Failed to load stats');
    const stats = await statsResponse.json();

    accountModalData = { user, avatar, stats };
    updateAccountModalUI();

  } catch (error) {
    console.error('Error loading account data:', error);
    // Show error in modal
    const modal = document.getElementById('account-modal-content');
    if (modal) {
      modal.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #dc3545;">
          Failed to load account data. Please try again.
        </div>
      `;
    }
  }
}

/**
 * Update the account modal UI with loaded data
 */
function updateAccountModalUI() {
  if (!accountModalData) return;

  const { user, avatar, stats } = accountModalData;

  // Avatar section
  const avatarContainer = document.getElementById('account-avatar-container');
  if (avatarContainer) {
    // Check for queue status first
    if (avatar.queueStatus) {
      if (avatar.queueStatus === 'pending') {
        avatarContainer.innerHTML = `
          <div class="avatar-placeholder" style="background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);">
            <div class="placeholder-icon">⏳</div>
            <div class="placeholder-text">Avatar in queue...</div>
          </div>
        `;
        avatarContainer.onclick = null;
      } else if (avatar.queueStatus === 'processing') {
        const progress = avatar.imageCount || 0;
        avatarContainer.innerHTML = `
          <div class="avatar-placeholder" style="background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);">
            <div class="placeholder-icon">🎨</div>
            <div class="placeholder-text">Generating...<br>${progress}/9 images</div>
          </div>
        `;
        avatarContainer.onclick = null;
      } else if (avatar.queueStatus === 'completed') {
        avatarContainer.innerHTML = `
          <div class="avatar-placeholder" style="background: linear-gradient(135deg, #27ae60 0%, #229954 100%);">
            <div class="placeholder-icon">✓</div>
            <div class="placeholder-text">Click to select your avatar</div>
          </div>
        `;
        avatarContainer.onclick = () => window.location.href = '/user/avatar-select.html';
      } else if (avatar.queueStatus === 'failed') {
        avatarContainer.innerHTML = `
          <div class="avatar-placeholder" style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); cursor: default;">
            <div class="placeholder-icon">⚠️</div>
            <div class="placeholder-text">Failed, Chatling engineers working on a fix</div>
          </div>
        `;
        avatarContainer.onclick = null;
        avatarContainer.style.cursor = 'default';
      }
    } else if (avatar.hasAvatar) {
      // Has avatar, no queue
      avatarContainer.innerHTML = `
        <div class="account-avatar-wrapper">
          <img src="${avatar.avatarUrl}" alt="Avatar" class="account-avatar-image">
          <div class="avatar-overlay">Click to change</div>
        </div>
      `;
      avatarContainer.onclick = () => window.location.href = '/user/avatar-select.html';
    } else {
      // No avatar, no queue
      avatarContainer.innerHTML = `
        <div class="avatar-placeholder">
          <div class="placeholder-icon">👤</div>
          <div class="placeholder-text">Click to create your avatar</div>
        </div>
      `;
      avatarContainer.onclick = () => window.location.href = '/user/avatar-create.html';
    }
  }

  // User info
  const usernameEl = document.getElementById('account-username');
  if (usernameEl) usernameEl.textContent = user.username || 'User';

  const emailEl = document.getElementById('account-email');
  if (emailEl) emailEl.textContent = user.provider_email || user.email || '';

  // Member since
  const memberSinceEl = document.getElementById('account-member-since');
  if (memberSinceEl && user.created_at) {
    const date = new Date(user.created_at);
    const formatted = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    memberSinceEl.textContent = `Member since ${formatted}`;
  }

  // Stats
  const chatlingsEl = document.getElementById('account-chatlings');
  if (chatlingsEl) chatlingsEl.textContent = stats.total_rewards || 0;

  const achievementsEl = document.getElementById('account-achievements');
  if (achievementsEl) achievementsEl.textContent = stats.total_achievements || 0;
}

/**
 * Initialize account modal HTML if not already present
 */
function initAccountModalHTML() {
  // Check if modal already exists
  if (document.getElementById('account-modal')) return;

  // Create modal HTML
  const modalHTML = `
    <div id="account-modal" class="account-modal-overlay">
      <div class="account-modal-container">
        <div class="account-modal-header">
          <h2 class="account-modal-title">My Account</h2>
          <button class="account-modal-close" onclick="closeAccountModal()">×</button>
        </div>
        <div class="account-modal-content" id="account-modal-content">
          <div id="account-avatar-container" class="avatar-section">
            <div class="loading-spinner"></div>
          </div>

          <div class="account-info">
            <div class="account-username" id="account-username">Loading...</div>
            <div class="account-email" id="account-email"></div>
            <div class="account-member-since" id="account-member-since"></div>
          </div>

          <div class="account-stats">
            <div class="stat">
              <div class="stat-value" id="account-chatlings">0</div>
              <div class="stat-label">Chatlings</div>
            </div>
            <div class="stat">
              <div class="stat-value" id="account-achievements">0</div>
              <div class="stat-label">Achievements</div>
            </div>
          </div>

          <div class="account-actions">
            <button class="account-button" onclick="window.location.href='/user/settings.html'">
              <span>⚙️</span> Settings
            </button>
            <button class="account-button" onclick="logout()">
              <span>🚪</span> Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Append to body
  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Event Listeners

// Close modal when clicking overlay
document.addEventListener('click', (e) => {
  const modal = document.getElementById('account-modal');
  if (e.target === modal) {
    closeAccountModal();
  }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('account-modal');
    if (modal && modal.classList.contains('active')) {
      closeAccountModal();
    }
  }
});

// Initialize modal HTML when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAccountModalHTML);
} else {
  initAccountModalHTML();
}
