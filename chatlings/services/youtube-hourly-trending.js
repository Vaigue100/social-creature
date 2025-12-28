/**
 * YouTube Hourly Trending Service
 * Fetches trending videos with more variety than daily trending
 */

const { google } = require('googleapis');
const youtube = google.youtube('v3');

class YouTubeHourlyTrendingService {
  constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY;
    this.regionCode = process.env.YOUTUBE_REGION_CODE || 'US';
  }

  /**
   * Get a trending video for chatroom
   * More variety than daily trending
   */
  async getTrendingVideoForChatroom() {
    try {
      // Get trending videos
      const response = await youtube.videos.list({
        key: this.apiKey,
        part: 'snippet,statistics,contentDetails',
        chart: 'mostPopular',
        regionCode: this.regionCode,
        maxResults: 50
      });

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error('No trending videos found');
      }

      // Filter for recent videos (uploaded in last 24 hours for freshness)
      const recentVideos = response.data.items.filter(video => {
        const uploadTime = new Date(video.snippet.publishedAt);
        const hoursSinceUpload = (Date.now() - uploadTime) / (1000 * 60 * 60);
        return hoursSinceUpload <= 24;
      });

      // If we have recent videos, pick from those
      const candidateVideos = recentVideos.length > 0
        ? recentVideos
        : response.data.items;

      // Filter out shorts and live streams
      const regularVideos = candidateVideos.filter(video => {
        const duration = video.contentDetails?.duration || '';
        // Shorts are typically < 60 seconds (PT1M format)
        // We want videos >= 2 minutes
        const isShort = duration.includes('PT') && !duration.includes('M');
        const isLive = video.snippet.liveBroadcastContent === 'live';

        return !isShort && !isLive;
      });

      if (regularVideos.length === 0) {
        // Fallback to any video if all filtered out
        return this.selectRandomVideo(candidateVideos.slice(0, 10));
      }

      // Randomly select from top 10 to add variety
      const topVideos = regularVideos.slice(0, 10);
      const selectedVideo = this.selectRandomVideo(topVideos);

      console.log(`✅ Selected trending video: "${selectedVideo.snippet.title}"`);
      console.log(`   Category: ${selectedVideo.snippet.categoryId}`);
      console.log(`   Published: ${selectedVideo.snippet.publishedAt}`);

      return selectedVideo;

    } catch (error) {
      console.error('Error fetching trending video:', error.message);
      throw error;
    }
  }

  /**
   * Get trending videos by category
   */
  async getTrendingByCategory(categoryId) {
    try {
      const response = await youtube.videos.list({
        key: this.apiKey,
        part: 'snippet,statistics,contentDetails',
        chart: 'mostPopular',
        regionCode: this.regionCode,
        videoCategoryId: categoryId,
        maxResults: 20
      });

      return response.data.items || [];

    } catch (error) {
      console.error(`Error fetching category ${categoryId}:`, error.message);
      return [];
    }
  }

  /**
   * Get video by ID
   */
  async getVideoById(videoId) {
    try {
      const response = await youtube.videos.list({
        key: this.apiKey,
        part: 'snippet,statistics,contentDetails',
        id: videoId
      });

      return response.data.items?.[0] || null;

    } catch (error) {
      console.error(`Error fetching video ${videoId}:`, error.message);
      return null;
    }
  }

  /**
   * Search for videos by query
   */
  async searchVideos(query, maxResults = 10) {
    try {
      const response = await youtube.search.list({
        key: this.apiKey,
        part: 'snippet',
        q: query,
        type: 'video',
        maxResults: maxResults,
        order: 'viewCount',
        publishedAfter: this.getDateXHoursAgo(24) // Last 24 hours
      });

      // Get full video details
      const videoIds = response.data.items.map(item => item.id.videoId).join(',');

      if (!videoIds) {
        return [];
      }

      const videosResponse = await youtube.videos.list({
        key: this.apiKey,
        part: 'snippet,statistics,contentDetails',
        id: videoIds
      });

      return videosResponse.data.items || [];

    } catch (error) {
      console.error(`Error searching videos for "${query}":`, error.message);
      return [];
    }
  }

  /**
   * Randomly select a video from array
   */
  selectRandomVideo(videos) {
    if (!videos || videos.length === 0) {
      throw new Error('No videos to select from');
    }

    const index = Math.floor(Math.random() * videos.length);
    return videos[index];
  }

  /**
   * Get ISO date string for X hours ago
   */
  getDateXHoursAgo(hours) {
    const date = new Date();
    date.setHours(date.getHours() - hours);
    return date.toISOString();
  }

  /**
   * Validate API key is configured
   */
  validateApiKey() {
    if (!this.apiKey) {
      throw new Error('YOUTUBE_API_KEY not configured in environment');
    }
  }

  /**
   * Get API quota usage info
   */
  async checkQuotaUsage() {
    // Each request costs quota units:
    // - videos.list: 1 unit
    // - search.list: 100 units
    //
    // Daily quota: 10,000 units
    //
    // Our usage per day:
    // - 3 chatrooms * videos.list = 3 units
    // - Well within quota!

    return {
      estimatedDailyUsage: 3,
      quotaLimit: 10000,
      percentUsed: 0.03
    };
  }
}

module.exports = new YouTubeHourlyTrendingService();
