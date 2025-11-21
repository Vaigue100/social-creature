/**
 * YouTube Metadata Service
 * Fetches video metadata from YouTube API for conversation topics
 */

const { google } = require('googleapis');
const { Client } = require('pg');

class YouTubeMetadataService {
  constructor(dbConfig, apiKey) {
    this.dbConfig = dbConfig;
    this.apiKey = apiKey;
    this.youtube = google.youtube({
      version: 'v3',
      auth: apiKey
    });
  }

  /**
   * Fetch video metadata from YouTube API
   * @param {string} videoId - YouTube video ID
   * @returns {object} Video metadata
   */
  async fetchVideoMetadata(videoId) {
    try {
      const response = await this.youtube.videos.list({
        part: ['snippet', 'contentDetails', 'statistics'],
        id: [videoId]
      });

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error(`Video not found: ${videoId}`);
      }

      const video = response.data.items[0];
      const snippet = video.snippet;
      const contentDetails = video.contentDetails;

      // Parse duration (ISO 8601 format like "PT4M13S" to seconds)
      const durationSeconds = this.parseDuration(contentDetails.duration);

      return {
        videoId: videoId,
        title: snippet.title,
        channelName: snippet.channelTitle,
        description: snippet.description,
        tags: snippet.tags || [],
        category: snippet.categoryId,
        publishedAt: snippet.publishedAt,
        durationSeconds: durationSeconds,
        thumbnailUrl: snippet.thumbnails.high?.url || snippet.thumbnails.default?.url
      };

    } catch (error) {
      console.error(`Error fetching video metadata for ${videoId}:`, error.message);
      throw error;
    }
  }

  /**
   * Parse ISO 8601 duration to seconds
   * @param {string} duration - ISO 8601 duration (e.g., "PT4M13S")
   * @returns {number} Duration in seconds
   */
  parseDuration(duration) {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);

    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Add a YouTube video as a trending topic
   * @param {string} videoId - YouTube video ID
   * @returns {object} Created topic
   */
  async addVideoAsTopic(videoId) {
    const client = new Client(this.dbConfig);

    try {
      await client.connect();

      // Check if video already exists as topic
      const existing = await client.query(
        'SELECT * FROM trending_topics WHERE youtube_video_id = $1',
        [videoId]
      );

      if (existing.rows.length > 0) {
        console.log(`Video ${videoId} already exists as topic`);
        return existing.rows[0];
      }

      // Fetch metadata from YouTube
      const metadata = await this.fetchVideoMetadata(videoId);

      // Create topic_text from video title
      const topicText = `Did you see this video? "${metadata.title}"`;

      // Insert into database
      const result = await client.query(`
        INSERT INTO trending_topics (
          topic_text,
          youtube_video_id,
          video_title,
          channel_name,
          video_description,
          video_tags,
          video_category,
          video_published_at,
          video_duration_seconds,
          video_thumbnail_url,
          is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
        RETURNING *
      `, [
        topicText,
        metadata.videoId,
        metadata.title,
        metadata.channelName,
        metadata.description,
        metadata.tags,
        metadata.category,
        metadata.publishedAt,
        metadata.durationSeconds,
        metadata.thumbnailUrl
      ]);

      console.log(`✓ Added YouTube video "${metadata.title}" as topic`);
      return result.rows[0];

    } finally {
      await client.end();
    }
  }

  /**
   * Get random YouTube topic for conversation
   * @returns {object} Topic with YouTube metadata
   */
  async getRandomYouTubeTopic() {
    const client = new Client(this.dbConfig);

    try {
      await client.connect();

      const result = await client.query(`
        SELECT * FROM trending_topics
        WHERE youtube_video_id IS NOT NULL
        AND is_active = true
        ORDER BY RANDOM()
        LIMIT 1
      `);

      if (result.rows.length === 0) {
        throw new Error('No YouTube topics available');
      }

      return result.rows[0];

    } finally {
      await client.end();
    }
  }

  /**
   * Refresh metadata for an existing topic
   * @param {string} topicId - Topic ID (UUID)
   */
  async refreshTopicMetadata(topicId) {
    const client = new Client(this.dbConfig);

    try {
      await client.connect();

      // Get existing topic
      const topicResult = await client.query(
        'SELECT youtube_video_id FROM trending_topics WHERE id = $1',
        [topicId]
      );

      if (topicResult.rows.length === 0) {
        throw new Error(`Topic not found: ${topicId}`);
      }

      const videoId = topicResult.rows[0].youtube_video_id;

      if (!videoId) {
        throw new Error('Topic is not a YouTube video');
      }

      // Fetch fresh metadata
      const metadata = await this.fetchVideoMetadata(videoId);

      // Update database
      await client.query(`
        UPDATE trending_topics
        SET
          video_title = $1,
          channel_name = $2,
          video_description = $3,
          video_tags = $4,
          video_category = $5,
          video_published_at = $6,
          video_duration_seconds = $7,
          video_thumbnail_url = $8
        WHERE id = $9
      `, [
        metadata.title,
        metadata.channelName,
        metadata.description,
        metadata.tags,
        metadata.category,
        metadata.publishedAt,
        metadata.durationSeconds,
        metadata.thumbnailUrl,
        topicId
      ]);

      console.log(`✓ Refreshed metadata for topic ${topicId}`);

    } finally {
      await client.end();
    }
  }
}

module.exports = YouTubeMetadataService;
