-- Migration: YouTube Integration
-- Adds tables and columns needed for YouTube chatling discovery game

\c chatlings;

-- Add YouTube OAuth fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS youtube_user_id VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS youtube_channel_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS youtube_access_token TEXT,
ADD COLUMN IF NOT EXISTS youtube_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS youtube_token_expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS youtube_connected_at TIMESTAMP;

-- ============================================================================
-- YOUTUBE CHANNEL ASSIGNMENTS
-- Tracks which chatling is currently assigned to each YouTube channel
-- Each channel gets one chatling for 24 hours
-- ============================================================================

CREATE TABLE IF NOT EXISTS youtube_channel_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id VARCHAR(255) NOT NULL, -- YouTube channel ID
    creature_id UUID REFERENCES creatures(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,

    -- Only one active assignment per channel at a time
    UNIQUE(channel_id)
);

-- ============================================================================
-- NOTIFICATIONS
-- Track notifications for users when they discover new chatlings
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL, -- 'friend_discovered', 'achievement_unlocked', etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB, -- Store additional data like creature_id, youtube_video_url, etc.
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- ACHIEVEMENTS
-- Track user achievements
-- ============================================================================

CREATE TABLE IF NOT EXISTS achievements (
    id SERIAL PRIMARY KEY,
    achievement_key VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    icon_url VARCHAR(500),
    points INTEGER DEFAULT 0,
    requirement_type VARCHAR(50), -- 'encounter_count', 'rarity_tier', 'species_diversity', etc.
    requirement_value INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    achievement_id INTEGER REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, achievement_id)
);

-- ============================================================================
-- INDEXES for performance
-- ============================================================================

CREATE INDEX idx_youtube_assignments_channel ON youtube_channel_assignments(channel_id);
CREATE INDEX idx_youtube_assignments_expires ON youtube_channel_assignments(expires_at);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);
CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);

-- ============================================================================
-- SEED DATA: Initial Achievements
-- ============================================================================

INSERT INTO achievements (achievement_key, title, description, points, requirement_type, requirement_value)
VALUES
    ('first_encounter', 'First Friend', 'Discover your first chatling', 10, 'encounter_count', 1),
    ('social_butterfly', 'Social Butterfly', 'Meet 10 different chatlings', 25, 'encounter_count', 10),
    ('collector', 'Collector', 'Meet 50 different chatlings', 50, 'encounter_count', 50),
    ('legendary_hunter', 'Legendary Hunter', 'Encounter a Legendary chatling', 100, 'rarity_tier', NULL),
    ('epic_seeker', 'Epic Seeker', 'Encounter an Epic chatling', 50, 'rarity_tier', NULL),
    ('youtube_pioneer', 'YouTube Pioneer', 'Connect your YouTube account', 15, 'integration', NULL)
ON CONFLICT (achievement_key) DO NOTHING;

COMMENT ON TABLE youtube_channel_assignments IS 'Tracks which chatling is assigned to each YouTube channel (24hr duration)';
COMMENT ON TABLE notifications IS 'User notifications for friend discoveries and achievements';
COMMENT ON TABLE achievements IS 'Available achievements users can unlock';
COMMENT ON TABLE user_achievements IS 'Tracks which users have unlocked which achievements';
