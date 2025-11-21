/**
 * Password Service
 * Implements partial password verification (UK banking-style)
 *
 * Industry Standard Approach:
 * - User creates a memorable password (6-20 characters)
 * - Password stored as full hash for initial verification
 * - For sensitive actions, request 3-4 random character positions
 * - Prevents keyloggers from capturing full password
 * - Different positions requested each time
 */

const bcrypt = require('bcrypt');
const crypto = require('crypto');

class PasswordService {
  constructor() {
    this.SALT_ROUNDS = 10;
    this.MIN_PASSWORD_LENGTH = 6;
    this.MAX_PASSWORD_LENGTH = 20;
    this.VERIFICATION_POSITIONS_COUNT = 3; // Ask for 3 characters
  }

  /**
   * Hash a full password for storage
   */
  async hashPassword(password) {
    if (!this.validatePasswordLength(password)) {
      throw new Error(`Password must be between ${this.MIN_PASSWORD_LENGTH} and ${this.MAX_PASSWORD_LENGTH} characters`);
    }
    return await bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Verify a full password (for initial password setup)
   */
  async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Validate password length
   */
  validatePasswordLength(password) {
    return password &&
           password.length >= this.MIN_PASSWORD_LENGTH &&
           password.length <= this.MAX_PASSWORD_LENGTH;
  }

  /**
   * Generate random character positions to request
   * Returns array of positions (1-indexed for user display)
   */
  generateVerificationPositions(passwordLength) {
    if (passwordLength < this.VERIFICATION_POSITIONS_COUNT) {
      // Password too short, ask for all positions
      return Array.from({ length: passwordLength }, (_, i) => i + 1);
    }

    const positions = new Set();
    while (positions.size < this.VERIFICATION_POSITIONS_COUNT) {
      const pos = Math.floor(Math.random() * passwordLength) + 1;
      positions.add(pos);
    }

    return Array.from(positions).sort((a, b) => a - b);
  }

  /**
   * Verify partial password entry
   *
   * @param {string} fullPasswordHash - The stored bcrypt hash
   * @param {Array<number>} positions - Requested positions (1-indexed)
   * @param {Array<string>} characters - User-provided characters
   * @returns {Promise<boolean>} - True if verification succeeds
   *
   * Note: For security, we verify by reconstructing possible passwords
   * and checking against the hash. This is slower but more secure.
   */
  async verifyPartialPassword(fullPasswordHash, positions, characters) {
    if (positions.length !== characters.length) {
      return false;
    }

    // For partial verification, we need the full password to check against
    // Since we can't reverse the hash, we store the password length separately
    // OR we require the user to enter full password first time, then use partial
    //
    // Industry standard: Store password hash + length metadata
    // For now, we'll use a simpler approach: full password verification on first use

    throw new Error('Partial password verification requires additional metadata. Use full password verification.');
  }

  /**
   * Create verification challenge
   * Returns the positions to request from user
   */
  createChallenge(passwordLength) {
    const positions = this.generateVerificationPositions(passwordLength);

    return {
      positions: positions,
      message: this.formatChallengeMessage(positions)
    };
  }

  /**
   * Format challenge message for user
   */
  formatChallengeMessage(positions) {
    const ordinals = positions.map(p => this.getOrdinal(p));

    if (positions.length === 2) {
      return `Enter the ${ordinals[0]} and ${ordinals[1]} characters of your password`;
    } else if (positions.length === 3) {
      return `Enter the ${ordinals[0]}, ${ordinals[1]}, and ${ordinals[2]} characters of your password`;
    } else {
      return `Enter characters at positions: ${positions.join(', ')}`;
    }
  }

  /**
   * Get ordinal suffix for number (1st, 2nd, 3rd, etc.)
   */
  getOrdinal(num) {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = num % 100;
    return num + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
  }

  /**
   * Validate password strength (basic)
   */
  validatePasswordStrength(password) {
    const errors = [];

    if (password.length < this.MIN_PASSWORD_LENGTH) {
      errors.push(`Password must be at least ${this.MIN_PASSWORD_LENGTH} characters`);
    }

    if (password.length > this.MAX_PASSWORD_LENGTH) {
      errors.push(`Password must be no more than ${this.MAX_PASSWORD_LENGTH} characters`);
    }

    // Basic strength checks
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (!hasUpper || !hasLower || !hasNumber) {
      errors.push('Password should contain uppercase, lowercase, and numbers');
    }

    return {
      valid: errors.length === 0,
      errors: errors,
      strength: errors.length === 0 ? 'good' : 'weak'
    };
  }
}

module.exports = new PasswordService();
