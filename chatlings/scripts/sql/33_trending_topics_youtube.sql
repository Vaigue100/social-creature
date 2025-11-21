-- Migration 33: Add YouTube video metadata to trending_topics
-- This allows conversations to reference actual YouTube videos with real context

-- Add YouTube-specific columns to trending_topics
ALTER TABLE trending_topics
ADD COLUMN IF NOT EXISTS youtube_video_id VARCHAR(20),
ADD COLUMN IF NOT EXISTS video_title TEXT,
ADD COLUMN IF NOT EXISTS channel_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS video_description TEXT,
ADD COLUMN IF NOT EXISTS video_tags TEXT[],
ADD COLUMN IF NOT EXISTS video_category VARCHAR(100),
ADD COLUMN IF NOT EXISTS video_published_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS video_duration_seconds INT,
ADD COLUMN IF NOT EXISTS video_thumbnail_url TEXT;

-- Create index on youtube_video_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_trending_topics_youtube_video_id
ON trending_topics(youtube_video_id);

-- For non-YouTube topics, these columns will be NULL
-- For YouTube topics, topic_text will be auto-generated from video_title

-- Add some example YouTube topics for testing
INSERT INTO trending_topics (topic_text, youtube_video_id, video_title, channel_name, video_description, is_active)
VALUES
(
    'Did you see this video about space exploration?',
    'dQw4w9WgXcQ',
    'Amazing Space Documentary',
    'Science Channel',
    'Explore the wonders of our universe',
    true
)
ON CONFLICT DO NOTHING;

-- Verify
SELECT
    COUNT(*) as total_topics,
    COUNT(youtube_video_id) as youtube_topics
FROM trending_topics;
