/**
 * Migration 30: Chatroom System
 *
 * Creates tables for chatling conversations, mood tracking, and runaway chatlings
 *
 * Features:
 * - Conversations happen 1-2 times per day
 * - 2-5 chatlings participate (weighted probability)
 * - Global trending topics
 * - Mood system (happy/neutral/unhappy)
 * - Runaway pool for unhappy chatlings that leave
 */

-- ============================================================================
-- 1. Trending Topics Pool (Global)
-- ============================================================================

CREATE TABLE IF NOT EXISTS trending_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_text TEXT NOT NULL, -- "The new AI chatbot drama on Twitter"
  category VARCHAR(50), -- 'social_media', 'gaming', 'tech', 'entertainment', 'memes'
  sentiment VARCHAR(20), -- 'controversial', 'funny', 'exciting', 'neutral'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP + INTERVAL '7 days'
);

CREATE INDEX idx_trending_topics_active ON trending_topics(is_active, expires_at);

COMMENT ON TABLE trending_topics IS 'Global pool of trending topics for chatling conversations';

-- ============================================================================
-- 2. Chatling Conversations
-- ============================================================================

CREATE TABLE IF NOT EXISTS chatling_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES trending_topics(id),
  topic_text TEXT, -- Denormalized for history
  participant_count INT NOT NULL, -- 2-5
  mood_impact JSONB, -- {"happy": [creature_id1], "unhappy": [creature_id2], "neutral": [...]}
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_conversations_user ON chatling_conversations(user_id, created_at DESC);
CREATE INDEX idx_conversations_unread ON chatling_conversations(user_id, is_read) WHERE is_read = false;

COMMENT ON TABLE chatling_conversations IS 'Conversation sessions between user chatlings';
COMMENT ON COLUMN chatling_conversations.mood_impact IS 'JSON tracking which chatlings became happy/unhappy';

-- ============================================================================
-- 3. Conversation Messages
-- ============================================================================

CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chatling_conversations(id) ON DELETE CASCADE,
  creature_id UUID NOT NULL REFERENCES creatures(id),
  message_text TEXT NOT NULL,
  message_order INT NOT NULL, -- Order in conversation (1, 2, 3...)
  sentiment VARCHAR(20), -- 'positive', 'negative', 'neutral', 'excited', 'angry'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_conversation ON conversation_messages(conversation_id, message_order);

COMMENT ON TABLE conversation_messages IS 'Individual messages in chatling conversations';

-- ============================================================================
-- 4. Chatling Mood Tracking (extends user_rewards)
-- ============================================================================

ALTER TABLE user_rewards
ADD COLUMN IF NOT EXISTS mood_status VARCHAR(20) DEFAULT 'neutral',
ADD COLUMN IF NOT EXISTS mood_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS unhappy_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_conversation_at TIMESTAMP;

COMMENT ON COLUMN user_rewards.mood_status IS 'Current mood: happy, neutral, unhappy';
COMMENT ON COLUMN user_rewards.unhappy_count IS 'Times chatling became unhappy (resets on happy)';
COMMENT ON COLUMN user_rewards.last_conversation_at IS 'Last time this chatling participated in conversation';

CREATE INDEX IF NOT EXISTS idx_user_rewards_mood ON user_rewards(user_id, mood_status);

-- ============================================================================
-- 5. Runaway Chatlings (left due to unhappiness)
-- ============================================================================

CREATE TABLE IF NOT EXISTS runaway_chatlings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creature_id UUID NOT NULL REFERENCES creatures(id),
  ran_away_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  unhappy_count INT, -- How many times unhappy before leaving
  last_conversation_id UUID REFERENCES chatling_conversations(id),
  recovery_difficulty VARCHAR(20) DEFAULT 'normal', -- 'easy', 'normal', 'hard'
  is_recovered BOOLEAN DEFAULT false,
  recovered_at TIMESTAMP
);

CREATE INDEX idx_runaway_user ON runaway_chatlings(user_id, is_recovered);
CREATE INDEX idx_runaway_active ON runaway_chatlings(user_id) WHERE is_recovered = false;

COMMENT ON TABLE runaway_chatlings IS 'Chatlings that left collection due to unhappiness';
COMMENT ON COLUMN runaway_chatlings.recovery_difficulty IS 'How hard it is to recover this chatling';

-- ============================================================================
-- 6. Conversation Generation Log (for scheduling)
-- ============================================================================

CREATE TABLE IF NOT EXISTS conversation_generation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_name VARCHAR(100), -- 'morning_batch', 'evening_batch'
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  users_processed INT DEFAULT 0,
  conversations_created INT DEFAULT 0,
  errors INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'running' -- 'running', 'completed', 'failed'
);

CREATE INDEX idx_generation_log ON conversation_generation_log(started_at DESC);

COMMENT ON TABLE conversation_generation_log IS 'Logs background job runs for conversation generation';

-- ============================================================================
-- 7. Insert some initial trending topics
-- ============================================================================

INSERT INTO trending_topics (topic_text, category, sentiment) VALUES
('The new AI chatbot that roasted everyone on Twitter', 'social_media', 'funny'),
('That viral TikTok dance everyone is doing', 'social_media', 'exciting'),
('The gaming tournament drama from last night', 'gaming', 'controversial'),
('New phone launch - is it worth the hype?', 'tech', 'neutral'),
('The meme that took over Instagram this week', 'memes', 'funny'),
('Influencer apology video - are they genuine?', 'social_media', 'controversial'),
('New streaming show everyone is talking about', 'entertainment', 'exciting'),
('The bug in that popular game ruining everything', 'gaming', 'controversial'),
('Celebrity feud heating up on social media', 'entertainment', 'controversial'),
('Wholesome animal video that made everyone cry', 'social_media', 'exciting')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Verification
-- ============================================================================

SELECT 'Migration 30 complete!' as status;
SELECT COUNT(*) as trending_topics_count FROM trending_topics WHERE is_active = true;
