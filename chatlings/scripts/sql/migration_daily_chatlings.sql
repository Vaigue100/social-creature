-- Migration: Daily Chatling Visits and User-Chatling Associations
-- Adds support for:
-- 1. Daily chatling visits (auto-added to collection)
-- 2. User's current active chatling
-- 3. Creator chatlings (chatlings that represent YouTube video creators)
-- 4. Enhanced notification types

-- Add last daily visit tracking to users
-- Note: current_creature_id already exists in users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_daily_visit TIMESTAMP DEFAULT NULL;

-- Update notifications table to support more notification types
-- notification_type values:
-- 'daily_visit' - Daily chatling visit
-- 'new_discovery' - New chatling discovered from liked video
-- 'achievement_unlocked' - Achievement earned
-- 'chatling_evolved' - Chatling evolved or changed
-- 'new_conversation' - New conversation started
-- 'reward_claimed' - Reward claimed
-- 'youtube_reminder' - YouTube reminder
-- 'daily_chatling' - Daily chatling notification (legacy, same as daily_visit)
ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS check_notification_type;

ALTER TABLE notifications
ADD CONSTRAINT check_notification_type
CHECK (notification_type IN ('daily_visit', 'new_discovery', 'achievement_unlocked', 'chatling_evolved', 'new_conversation', 'reward_claimed', 'youtube_reminder', 'daily_chatling'));

-- Create table to track which chatling represents each YouTube channel
-- When a user likes a video, they might encounter the creator's chatling
CREATE TABLE IF NOT EXISTS creator_chatlings (
    channel_id VARCHAR(255) PRIMARY KEY,
    channel_title TEXT,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    chatling_id UUID REFERENCES creatures(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, chatling_id)
);

CREATE INDEX IF NOT EXISTS idx_creator_chatlings_user ON creator_chatlings(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_chatlings_channel ON creator_chatlings(channel_id);

-- Create table to track daily chatling visit history
CREATE TABLE IF NOT EXISTS daily_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    chatling_id UUID REFERENCES creatures(id) ON DELETE CASCADE,
    visit_date DATE NOT NULL,
    was_new_discovery BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, visit_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_visits_user ON daily_visits(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_visits_date ON daily_visits(visit_date);

-- Function to assign daily chatling
-- This will be called by the service layer
CREATE OR REPLACE FUNCTION assign_daily_chatling(p_user_id UUID)
RETURNS TABLE(
    chatling_id UUID,
    chatling_name TEXT,
    was_new_discovery BOOLEAN
) AS $$
DECLARE
    v_chatling_id UUID;
    v_chatling_name TEXT;
    v_already_owned BOOLEAN;
    v_today DATE;
BEGIN
    v_today := CURRENT_DATE;

    -- Check if user already had a visit today
    IF EXISTS (
        SELECT 1 FROM daily_visits
        WHERE user_id = p_user_id AND visit_date = v_today
    ) THEN
        -- Return the chatling from today's visit
        RETURN QUERY
        SELECT
            dv.chatling_id,
            c.creature_name,
            dv.was_new_discovery
        FROM daily_visits dv
        JOIN creatures c ON dv.chatling_id = c.id
        WHERE dv.user_id = p_user_id AND dv.visit_date = v_today;
        RETURN;
    END IF;

    -- Select a random chatling
    SELECT id, creature_name
    INTO v_chatling_id, v_chatling_name
    FROM creatures
    WHERE is_active = TRUE
    ORDER BY RANDOM()
    LIMIT 1;

    -- Check if user already owns this chatling
    v_already_owned := EXISTS (
        SELECT 1 FROM user_rewards
        WHERE user_id = p_user_id AND creature_id = v_chatling_id
    );

    -- If not owned, add to collection
    IF NOT v_already_owned THEN
        INSERT INTO user_rewards (user_id, creature_id, claimed_at)
        VALUES (p_user_id, v_chatling_id, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, creature_id) DO NOTHING;
    END IF;

    -- Update user's current chatling
    UPDATE users
    SET current_creature_id = v_chatling_id,
        last_daily_visit = CURRENT_TIMESTAMP
    WHERE id = p_user_id;

    -- Record the daily visit
    INSERT INTO daily_visits (user_id, chatling_id, visit_date, was_new_discovery)
    VALUES (p_user_id, v_chatling_id, v_today, NOT v_already_owned);

    -- Create notification
    INSERT INTO notifications (user_id, notification_type, title, message, is_read, created_at)
    VALUES (
        p_user_id,
        'daily_visit',
        CASE
            WHEN NOT v_already_owned THEN
                'New Daily Visitor!'
            ELSE
                'Daily Visit'
        END,
        CASE
            WHEN NOT v_already_owned THEN
                v_chatling_name || ' visited you today! This is a new chatling in your collection!'
            ELSE
                v_chatling_name || ' visited you today!'
        END,
        FALSE,
        CURRENT_TIMESTAMP
    );

    -- Return the result
    RETURN QUERY
    SELECT v_chatling_id, v_chatling_name, NOT v_already_owned;
END;
$$ LANGUAGE plpgsql;

-- Add source column to user_rewards if it doesn't exist
ALTER TABLE user_rewards
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'video_like';

-- Update constraint to include new source types
-- source values: 'video_like', 'daily_visit', 'creator_encounter'
COMMENT ON COLUMN user_rewards.source IS 'Source of reward: video_like, daily_visit, creator_encounter';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_current_creature ON users(current_creature_id);
CREATE INDEX IF NOT EXISTS idx_users_last_daily_visit ON users(last_daily_visit);

-- Add comments for documentation
COMMENT ON COLUMN users.current_creature_id IS 'The chatling currently representing this user';
COMMENT ON COLUMN users.last_daily_visit IS 'When the user last received their daily chatling visit';
COMMENT ON TABLE creator_chatlings IS 'Maps YouTube channels to chatlings (owned by channel creators)';
COMMENT ON TABLE daily_visits IS 'History of daily chatling visits to users';
