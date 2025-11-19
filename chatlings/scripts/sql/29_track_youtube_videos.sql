/**
 * Migration 29: Track YouTube Video Sources
 *
 * Adds source_video_id to user_rewards to permanently track which
 * YouTube videos a user has already claimed rewards from.
 *
 * This prevents duplicate rewards when:
 * - Video rewards expire (24 hours)
 * - User reconnects YouTube
 * - Processing historical likes
 */

-- Add source_video_id column to track YouTube video source
ALTER TABLE user_rewards
ADD COLUMN IF NOT EXISTS source_video_id VARCHAR(255);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_rewards_source_video
ON user_rewards(user_id, source_video_id)
WHERE source_video_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN user_rewards.source_video_id IS 'YouTube video ID if reward came from liking a video (prevents duplicate rewards)';

-- Verify
SELECT
    COUNT(*) as total_rewards,
    COUNT(source_video_id) as youtube_rewards
FROM user_rewards;
