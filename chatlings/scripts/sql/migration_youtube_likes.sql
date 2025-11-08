-- Migration: YouTube Likes-Based Reward System (Privacy-First)
-- Replaces comment-based discovery with like-based rewards
-- No long-term user data storage

\c chatlings;

-- ============================================================================
-- VIDEO REWARD ASSIGNMENTS
-- Tracks which reward is assigned to each YouTube video (24hr TTL)
-- No user data stored - completely anonymous
-- ============================================================================

CREATE TABLE IF NOT EXISTS video_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id VARCHAR(255) NOT NULL UNIQUE, -- YouTube video ID
    creature_id UUID REFERENCES creatures(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,

    -- Index for expiry cleanup
    CONSTRAINT unique_video_reward UNIQUE(video_id)
);

CREATE INDEX IF NOT EXISTS idx_video_rewards_expires ON video_rewards(expires_at);
CREATE INDEX IF NOT EXISTS idx_video_rewards_video ON video_rewards(video_id);

-- ============================================================================
-- USER REWARDS (PERMANENT COLLECTION)
-- Once a user claims a reward, it's theirs forever
-- Decoupled from the video/platform
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    creature_id UUID REFERENCES creatures(id) ON DELETE CASCADE,
    claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    platform VARCHAR(50) DEFAULT 'YouTube', -- For future multi-platform support

    -- Prevent duplicate rewards
    UNIQUE(user_id, creature_id)
);

CREATE INDEX IF NOT EXISTS idx_user_rewards_user ON user_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_rewards_creature ON user_rewards(creature_id);

-- ============================================================================
-- CLEANUP FUNCTION
-- Automatically remove expired video-reward assignments
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_video_rewards()
RETURNS void AS $$
BEGIN
    DELETE FROM video_rewards WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- NOTIFICATIONS (simplified)
-- Track when users claim rewards
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL, -- 'reward_claimed', 'achievement_unlocked'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);

-- ============================================================================
-- ACHIEVEMENTS (simplified for likes-based system)
-- ============================================================================

CREATE TABLE IF NOT EXISTS achievements (
    id SERIAL PRIMARY KEY,
    achievement_key VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    icon_url VARCHAR(500),
    points INTEGER DEFAULT 0,
    requirement_type VARCHAR(50), -- 'reward_count', 'rarity_tier', etc.
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

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);

-- ============================================================================
-- SEED DATA: Initial Achievements
-- ============================================================================

INSERT INTO achievements (achievement_key, title, description, points, requirement_type, requirement_value)
VALUES
    ('first_reward', 'First Reward', 'Claim your first chatling', 10, 'reward_count', 1),
    ('collector_10', 'Collector', 'Claim 10 different chatlings', 25, 'reward_count', 10),
    ('collector_50', 'Super Collector', 'Claim 50 different chatlings', 50, 'reward_count', 50),
    ('collector_100', 'Master Collector', 'Claim 100 different chatlings', 100, 'reward_count', 100),
    ('legendary_hunter', 'Legendary Hunter', 'Claim a Legendary chatling', 100, 'rarity_tier', NULL),
    ('epic_seeker', 'Epic Seeker', 'Claim an Epic chatling', 50, 'rarity_tier', NULL)
ON CONFLICT (achievement_key) DO NOTHING;

COMMENT ON TABLE video_rewards IS 'Anonymous mapping of video IDs to rewards (24hr TTL, no user data)';
COMMENT ON TABLE user_rewards IS 'Permanent user reward collection (decoupled from videos)';
COMMENT ON TABLE notifications IS 'User notifications for reward claims and achievements';
