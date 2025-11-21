/**
 * Username Validation Service
 * Enhanced profanity detection with custom word list and bypass prevention
 */

class UsernameValidationService {
  constructor() {
    this.filter = null;
    this.initPromise = this.init();

    // Custom blocked words/phrases to supplement bad-words package
    this.customBlockedWords = [
      // Add your custom blocked words here
      'admin',
      'moderator',
      'chatlings',
      'support',
      'official',
      'system',
      'bot'
    ];
  }

  async init() {
    if (!this.filter) {
      const { Filter } = await import('bad-words');
      this.filter = new Filter();

      // Add custom words to the filter
      this.filter.addWords(...this.customBlockedWords);
    }
  }

  async ensureInitialized() {
    await this.initPromise;
  }

  /**
   * Normalize username to detect bypass attempts
   * Converts leetspeak, removes special characters/spaces/numbers
   */
  normalizeUsername(username) {
    let normalized = username.toLowerCase();

    // Remove spaces, underscores, dashes
    normalized = normalized.replace(/[\s_\-]/g, '');

    // Convert leetspeak and number substitutions
    const substitutions = {
      '0': 'o',
      '1': 'i',
      '3': 'e',
      '4': 'a',
      '5': 's',
      '7': 't',
      '8': 'b',
      '@': 'a',
      '$': 's',
      '!': 'i',
      '+': 't'
    };

    for (const [leet, normal] of Object.entries(substitutions)) {
      // Escape special regex characters
      const escapedLeet = leet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      normalized = normalized.replace(new RegExp(escapedLeet, 'g'), normal);
    }

    // Remove remaining special characters and numbers
    normalized = normalized.replace(/[^a-z]/g, '');

    return normalized;
  }

  /**
   * Check if username contains inappropriate content
   * Returns { valid: boolean, reason: string }
   */
  async validateUsername(username) {
    await this.ensureInitialized();

    // Check if username exists and is a string
    if (!username || typeof username !== 'string') {
      return { valid: false, reason: 'Username is required' };
    }

    // Trim whitespace
    username = username.trim();

    if (!username) {
      return { valid: false, reason: 'Username is required' };
    }

    // Check for valid characters FIRST (alphanumeric, underscore, dash)
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return { valid: false, reason: 'Username can only contain letters, numbers, underscores (_), and hyphens (-)' };
    }

    // Check length after character validation
    if (username.length < 3) {
      return { valid: false, reason: 'Username must be at least 3 characters' };
    }

    if (username.length > 20) {
      return { valid: false, reason: 'Username must be 20 characters or less' };
    }

    // Check original username for inappropriate content
    if (this.filter.isProfane(username)) {
      return { valid: false, reason: 'Username contains inappropriate content' };
    }

    // Check normalized username to catch bypass attempts
    const normalized = this.normalizeUsername(username);
    if (this.filter.isProfane(normalized)) {
      return { valid: false, reason: 'Username contains inappropriate content' };
    }

    return { valid: true };
  }

  /**
   * Generate alternative username suggestions
   * Adds random numbers 1-99 to the username
   */
  generateAlternatives(username, count = 3) {
    const alternatives = [];
    const usedNumbers = new Set();

    while (alternatives.length < count) {
      const randomNum = Math.floor(Math.random() * 99) + 1;

      if (!usedNumbers.has(randomNum)) {
        usedNumbers.add(randomNum);
        alternatives.push(`${username}${randomNum}`);
      }
    }

    return alternatives;
  }

  /**
   * Add custom words to the blocked list
   */
  async addBlockedWords(...words) {
    await this.ensureInitialized();
    this.customBlockedWords.push(...words);
    this.filter.addWords(...words);
  }

  /**
   * Remove words from the blocked list (if needed)
   */
  async removeBlockedWords(...words) {
    await this.ensureInitialized();
    this.customBlockedWords = this.customBlockedWords.filter(w => !words.includes(w));
    this.filter.removeWords(...words);
  }
}

module.exports = new UsernameValidationService();
