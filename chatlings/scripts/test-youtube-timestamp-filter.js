const { Client } = require('pg');
const dbConfig = require('./db-config');
const YouTubeLikesService = require('../services/youtube-likes-service');

async function testTimestampFilter() {
  const client = new Client(dbConfig);
  const youtubeService = new YouTubeLikesService(dbConfig);

  try {
    await client.connect();

    // Get user with YouTube integration
    const userResult = await client.query(`
      SELECT u.id, oa.access_token, oa.youtube_integrated_at, oa.last_used_at
      FROM users u
      JOIN oauth_accounts oa ON u.id = oa.user_id
      WHERE oa.provider = 'youtube'
      LIMIT 1
    `);

    if (userResult.rows.length === 0) {
      console.log('No YouTube integration found');
      return;
    }

    const user = userResult.rows[0];
    console.log('Testing with user:', user.id);
    console.log('Integration timestamp:', user.youtube_integrated_at);
    console.log('Last check timestamp:', user.last_used_at);

    // Fetch liked videos
    const likedVideos = await youtubeService.getLikedVideos(user.access_token, 10);

    console.log(`\nFetched ${likedVideos.length} liked videos:\n`);

    const cutoffTime = user.last_used_at || user.youtube_integrated_at;
    console.log(`Cutoff time: ${new Date(cutoffTime).toLocaleString()}\n`);

    likedVideos.forEach((video, index) => {
      const likedAt = new Date(video.likedAt);
      const isNew = likedAt > new Date(cutoffTime);

      console.log(`${index + 1}. ${isNew ? '✅ NEW' : '❌ OLD'} - ${video.title}`);
      console.log(`   Liked at: ${likedAt.toLocaleString()}`);
      console.log(`   Video ID: ${video.videoId}`);
    });

    const newLikes = likedVideos.filter(v => new Date(v.likedAt) > new Date(cutoffTime));
    console.log(`\n📊 Summary:`);
    console.log(`   Total likes: ${likedVideos.length}`);
    console.log(`   New since last check: ${newLikes.length}`);
    console.log(`   Would skip: ${likedVideos.length - newLikes.length}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

testTimestampFilter();
