/**
 * Services Integration
 * Centralizes all service initialization
 * Privacy-first design - session-based, no long-term storage
 */

const YouTubeLikesService = require('./youtube-likes-service');
const ChatroomBackgroundService = require('./chatroom-background-service');

class Services {
  constructor(dbConfig) {
    this.dbConfig = dbConfig;

    // Initialize services
    this.youtubeLikes = new YouTubeLikesService(dbConfig);
    this.chatroomBackground = new ChatroomBackgroundService(dbConfig);
  }

  /**
   * Start all background services
   */
  start() {
    console.log('\n' + '='.repeat(80));
    console.log('Background Services Status');
    console.log('='.repeat(80));

    if (this.youtubeLikes.clientId && this.youtubeLikes.clientSecret) {
      console.log('✓ YouTube Likes Service ready (session-based, privacy-first)');
      console.log('  No polling - rewards claimed on-demand when user connects');
    } else {
      console.log('⚠️  YouTube OAuth not configured');
      console.log('   Add YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET to .env to enable');
    }

    // Start chatroom background service
    this.chatroomBackground.start();

    console.log('='.repeat(80) + '\n');
  }

  /**
   * Stop all background services
   */
  stop() {
    console.log('✓ Stopping services...');
    this.chatroomBackground.stop();
    console.log('✓ Services stopped');
  }
}

module.exports = Services;
