/**
 * OAuth Service
 * Handles linking OAuth providers to user accounts
 */

const { Pool } = require('pg');
const dbConfig = require('../scripts/db-config');
const crypto = require('crypto');

class OAuthService {
  constructor() {
    this.pool = new Pool(dbConfig);
  }

  /**
   * Find or create user from OAuth profile
   * If email exists, links OAuth to existing account
   * Otherwise creates new user
   */
  async findOrCreateUserFromOAuth(provider, profile) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Check if this OAuth account already exists
      const existingOAuth = await client.query(
        `SELECT user_id FROM oauth_accounts
         WHERE provider = $1 AND provider_user_id = $2`,
        [provider, profile.id]
      );

      if (existingOAuth.rows.length > 0) {
        // OAuth account exists, update last used
        await client.query(
          `UPDATE oauth_accounts
           SET last_used_at = CURRENT_TIMESTAMP
           WHERE provider = $1 AND provider_user_id = $2`,
          [provider, profile.id]
        );

        await client.query('COMMIT');
        return existingOAuth.rows[0].user_id;
      }

      // OAuth account doesn't exist - check if user exists by email
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
      let userId;

      if (email) {
        const existingUser = await client.query(
          'SELECT id FROM users WHERE email = $1',
          [email]
        );

        if (existingUser.rows.length > 0) {
          // User exists, link OAuth account
          userId = existingUser.rows[0].id;
          console.log(`Linking ${provider} account to existing user: ${email}`);
        }
      }

      // Create new user if doesn't exist
      if (!userId) {
        const username = profile.displayName || profile.emails[0].value.split('@')[0];
        const displayName = profile.displayName || username;

        const newUser = await client.query(
          `INSERT INTO users (username, email, display_name, created_at)
           VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
           RETURNING id`,
          [username, email, displayName]
        );

        userId = newUser.rows[0].id;
        console.log(`Created new user from ${provider}: ${email}`);
      }

      // Link OAuth account to user
      await client.query(
        `INSERT INTO oauth_accounts (
          user_id, provider, provider_user_id, provider_email,
          provider_display_name, created_at, last_used_at
        )
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [userId, provider, profile.id, email, profile.displayName]
      );

      await client.query('COMMIT');
      return userId;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all OAuth accounts linked to a user
   */
  async getUserOAuthAccounts(userId) {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `SELECT provider, provider_email, provider_display_name,
                created_at, last_used_at
         FROM oauth_accounts
         WHERE user_id = $1
         ORDER BY created_at ASC`,
        [userId]
      );

      return result.rows;

    } finally {
      client.release();
    }
  }

  /**
   * Unlink an OAuth account from a user
   * Only allowed if user has another auth method (password or another OAuth)
   */
  async unlinkOAuthAccount(userId, provider) {
    const client = await this.pool.connect();

    try {
      // Check if user has other auth methods
      const authMethods = await client.query(
        `SELECT COUNT(*) as count FROM oauth_accounts WHERE user_id = $1`,
        [userId]
      );

      const oauthCount = parseInt(authMethods.rows[0].count);

      // Check if user has a password
      const userResult = await client.query(
        `SELECT password_hash FROM users WHERE id = $1`,
        [userId]
      );

      const hasPassword = userResult.rows[0] && userResult.rows[0].password_hash;

      if (oauthCount <= 1 && !hasPassword) {
        throw new Error('Cannot remove last authentication method. Please set a password first.');
      }

      // Safe to remove
      const result = await client.query(
        `DELETE FROM oauth_accounts
         WHERE user_id = $1 AND provider = $2
         RETURNING id`,
        [userId, provider]
      );

      return result.rowCount > 0;

    } finally {
      client.release();
    }
  }

  /**
   * Close the database connection pool
   */
  async close() {
    await this.pool.end();
  }
}

module.exports = new OAuthService();
