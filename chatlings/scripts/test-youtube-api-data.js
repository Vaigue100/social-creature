const { google } = require('googleapis');
const { Client } = require('pg');
const dbConfig = require('./db-config');

async function testYouTubeAPIData() {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('Connected to database\n');

    // Get a user with YouTube integration
    const result = await client.query(`
      SELECT user_id, access_token, refresh_token
      FROM oauth_accounts
      WHERE provider = 'youtube' AND refresh_token IS NOT NULL
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      console.log('No YouTube integrations found');
      return;
    }

    const user = result.rows[0];
    console.log('Testing with user:', user.user_id);

    // Set up OAuth client
    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      process.env.YOUTUBE_REDIRECT_URI
    );

    oauth2Client.setCredentials({ access_token: user.access_token });

    const youtube = google.youtube({
      version: 'v3',
      auth: oauth2Client
    });

    console.log('\nFetching liked videos with ALL available parts...\n');

    // Fetch with all parts to see what data is available
    const response = await youtube.playlistItems.list({
      part: ['snippet', 'contentDetails', 'status'],
      playlistId: 'LL',
      maxResults: 5
    });

    console.log('=== YOUTUBE API RESPONSE ===\n');
    console.log('Total items:', response.data.items?.length || 0);

    if (response.data.items && response.data.items.length > 0) {
      const firstItem = response.data.items[0];

      console.log('\n=== FIRST LIKED VIDEO ===');
      console.log(JSON.stringify(firstItem, null, 2));

      console.log('\n=== KEY TIMESTAMPS ===');
      console.log('snippet.publishedAt:', firstItem.snippet?.publishedAt);
      console.log('contentDetails.videoPublishedAt:', firstItem.contentDetails?.videoPublishedAt);

      console.log('\n=== ALL AVAILABLE FIELDS ===');
      console.log('snippet fields:', Object.keys(firstItem.snippet || {}));
      console.log('contentDetails fields:', Object.keys(firstItem.contentDetails || {}));
      console.log('status fields:', Object.keys(firstItem.status || {}));

      console.log('\n=== ALL 5 VIDEOS WITH TIMESTAMPS ===');
      response.data.items.forEach((item, index) => {
        console.log(`\n${index + 1}. ${item.snippet.title}`);
        console.log(`   Video ID: ${item.snippet.resourceId.videoId}`);
        console.log(`   publishedAt: ${item.snippet.publishedAt}`);
        console.log(`   videoPublishedAt: ${item.contentDetails?.videoPublishedAt}`);
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  } finally {
    await client.end();
  }
}

testYouTubeAPIData();
