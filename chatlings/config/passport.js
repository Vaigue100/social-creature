/**
 * Passport Configuration
 * Sets up OAuth strategies (Google, GitHub, etc.)
 */

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const oauthService = require('../services/oauth-service');

// Serialize user ID into session
passport.serializeUser((userId, done) => {
  done(null, userId);
});

// Deserialize user ID from session
passport.deserializeUser((userId, done) => {
  done(null, userId);
});

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback',
    scope: ['profile', 'email']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Find or create user from Google profile
      const userId = await oauthService.findOrCreateUserFromOAuth('google', profile);
      done(null, userId);
    } catch (error) {
      console.error('Google OAuth error:', error);
      done(error, null);
    }
  }));

  console.log('✓ Google OAuth configured');
} else {
  console.log('⚠ Google OAuth not configured (missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET)');
}

module.exports = passport;
