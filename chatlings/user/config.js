// Configuration for Chatlings app
const CONFIG = {
  // Azure Blob Storage URLs
  ARTWORK_BASE_URL: 'https://chatlingsdevlyg7hq.blob.core.windows.net/artwork',
  ANIMATIONS_BASE_URL: 'https://chatlingsdevlyg7hq.blob.core.windows.net/animations',

  // Force blob storage for all assets (set to false to use local files)
  FORCE_BLOB_STORAGE: true,

  // Auto-detect environment
  // Returns true if running on localhost, false if on Azure
  isLocalEnvironment: function() {
    return window.location.hostname === 'localhost' ||
           window.location.hostname === '127.0.0.1' ||
           window.location.hostname.includes('192.168.');
  }
};

// Helper function to get artwork URL
// Uses blob storage when FORCE_BLOB_STORAGE is true or when deployed
function getArtworkUrl(path) {
  // Force blob storage or running on Azure
  if (CONFIG.FORCE_BLOB_STORAGE || !CONFIG.isLocalEnvironment()) {
    return `${CONFIG.ARTWORK_BASE_URL}/${path}`;
  }

  // Local development fallback
  return `/artwork/${path}`;
}

// Helper function to get creature image URL
// These are stored in the /images/ path (maps to artwork/linked/)
function getImageUrl(filename) {
  // Force blob storage or running on Azure
  if (CONFIG.FORCE_BLOB_STORAGE || !CONFIG.isLocalEnvironment()) {
    return `${CONFIG.ARTWORK_BASE_URL}/linked/${filename}`;
  }

  // Local development fallback
  return `/images/${filename}`;
}

// Helper function to get animation URL
// Animations are stored in Azure Blob Storage
function getAnimationUrl(filename) {
  // Always use blob storage for animations (they're not served locally)
  return `${CONFIG.ANIMATIONS_BASE_URL}/processed/${filename}`;
}
