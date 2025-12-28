/**
 * Daily Conversation Generation Job
 *
 * Runs daily at 3 AM to:
 * 1. Fetch trending YouTube videos
 * 2. Generate AI conversations for each video
 * 3. Store in database for user viewing
 */

const YouTubeConversationService = require('../services/youtube-conversation-service');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

/**
 * Fetch trending videos from trending_topics table
 * (Assumes trending_topics are already populated by YouTube service)
 */
async function fetchTrendingVideos(limit = 10) {
  const result = await pool.query(`
    SELECT
      id,
      youtube_video_id,
      title,
      description,
      thumbnail_url,
      category,
      subcategory,
      is_active
    FROM trending_topics
    WHERE is_active = true
      AND has_conversation = false
      AND youtube_video_id IS NOT NULL
    ORDER BY created_at DESC
    LIMIT $1
  `, [limit]);

  return result.rows;
}

/**
 * Main job function
 */
async function runDailyConversationGeneration() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🤖 DAILY AI CONVERSATION GENERATION JOB');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log('');

  const conversationService = new YouTubeConversationService();

  try {
    // Fetch trending videos that don't have conversations yet
    console.log('📹 Fetching trending videos...');
    const videos = await fetchTrendingVideos(10);

    if (videos.length === 0) {
      console.log('⚠️  No new videos found for conversation generation');
      console.log('   All trending videos already have conversations');
      return {
        success: true,
        message: 'No new videos to process',
        stats: {
          totalVideos: 0,
          successful: 0,
          failed: 0
        }
      };
    }

    console.log(`✓ Found ${videos.length} videos for processing\n`);

    // Generate conversations for all videos
    const stats = await conversationService.generateConversationsForVideos(videos);

    // Log final summary
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ DAILY JOB COMPLETED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Completed at: ${new Date().toISOString()}`);
    console.log(`\nResults:`);
    console.log(`  Videos processed: ${stats.totalVideos}`);
    console.log(`  Successful: ${stats.successful}`);
    console.log(`  Failed: ${stats.failed}`);
    console.log(`  Total comments generated: ${stats.totalComments}`);
    console.log(`  Total cost: $${stats.totalCost.toFixed(4)}`);
    console.log(`  Average cost per video: $${stats.successful > 0 ? (stats.totalCost / stats.successful).toFixed(4) : '0.0000'}`);

    if (stats.errors.length > 0) {
      console.log(`\n⚠️  Errors encountered:`);
      stats.errors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err.title}: ${err.error}`);
      });
    }

    console.log('\n');

    return {
      success: true,
      stats,
      message: `Generated ${stats.successful} conversations successfully`
    };

  } catch (error) {
    console.error('\n❌ DAILY JOB FAILED');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.log('\n');

    return {
      success: false,
      error: error.message,
      message: 'Daily conversation generation failed'
    };

  } finally {
    // Clean up
    await conversationService.close();
    await pool.end();
  }
}

/**
 * Schedule the job (if running as standalone process)
 */
async function scheduleDaily() {
  const schedule = require('node-schedule');

  console.log('📅 Scheduling daily conversation generation job...');
  console.log('   Time: 3:00 AM daily');

  // Run at 3 AM every day
  schedule.scheduleJob('0 3 * * *', async () => {
    await runDailyConversationGeneration();
  });

  console.log('✓ Job scheduled successfully');
  console.log('   Waiting for next run at 3:00 AM...\n');

  // Run immediately if FORCE_RUN_NOW environment variable is set
  if (process.env.FORCE_RUN_NOW === 'true') {
    console.log('🚀 FORCE_RUN_NOW detected, running job immediately...\n');
    await runDailyConversationGeneration();
  }
}

// Export for use as module or run standalone
module.exports = {
  runDailyConversationGeneration,
  scheduleDaily
};

// Run standalone if executed directly
if (require.main === module) {
  require('dotenv').config();

  // Check for immediate run
  if (process.argv.includes('--now') || process.env.RUN_NOW === 'true') {
    console.log('🚀 Running conversation generation immediately...\n');
    runDailyConversationGeneration()
      .then(result => {
        console.log('Job completed:', result);
        process.exit(result.success ? 0 : 1);
      })
      .catch(error => {
        console.error('Job failed:', error);
        process.exit(1);
      });
  } else {
    // Schedule for daily runs
    scheduleDaily().catch(error => {
      console.error('Failed to schedule job:', error);
      process.exit(1);
    });
  }
}
