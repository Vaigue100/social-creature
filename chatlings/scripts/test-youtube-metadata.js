/**
 * Test YouTube Metadata Service
 * Tests fetching video metadata and adding topics
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const dbConfig = require('./db-config');
const YouTubeMetadataService = require('../services/youtube-metadata-service');

async function test() {
  console.log('\n=== YouTube Metadata Service Test ===\n');

  // Check for API key
  if (!process.env.YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY === 'your_youtube_api_key_here') {
    console.error('❌ YOUTUBE_API_KEY not set in .env file');
    console.log('\nTo get a YouTube API key:');
    console.log('1. Go to https://console.cloud.google.com/');
    console.log('2. Enable YouTube Data API v3');
    console.log('3. Create credentials (API key)');
    console.log('4. Add YOUTUBE_API_KEY=your_key_here to .env');
    process.exit(1);
  }

  const service = new YouTubeMetadataService(dbConfig, process.env.YOUTUBE_API_KEY);

  // Test video IDs (popular science/tech videos)
  const testVideoIds = [
    'dQw4w9WgXcQ', // Famous video
    'jNQXAC9IVRw'  // "Me at the zoo" - first YouTube video
  ];

  for (const videoId of testVideoIds) {
    try {
      console.log(`\nTesting video: ${videoId}`);
      console.log('─'.repeat(50));

      // Fetch metadata
      const metadata = await service.fetchVideoMetadata(videoId);

      console.log(`✓ Title: ${metadata.title}`);
      console.log(`✓ Channel: ${metadata.channelName}`);
      console.log(`✓ Duration: ${metadata.durationSeconds} seconds`);
      console.log(`✓ Published: ${metadata.publishedAt}`);
      console.log(`✓ Description: ${metadata.description.substring(0, 100)}...`);
      console.log(`✓ Tags: ${metadata.tags.length} tags`);

      // Add as topic
      const topic = await service.addVideoAsTopic(videoId);
      console.log(`✓ Added as topic with ID: ${topic.id}`);

    } catch (error) {
      console.error(`❌ Error testing ${videoId}:`, error.message);
    }
  }

  console.log('\n=== Test Complete ===\n');
}

test().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
