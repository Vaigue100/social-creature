/**
 * Migration 32: Chat Likelihood System
 *
 * Adds dynamic chat probability based on user activity and engagement
 *
 * Factors:
 * - User login activity (40% weight)
 * - Number of chatlings (25% weight)
 * - Runaway count (20% weight)
 * - Recent chat frequency (15% weight)
 */

-- ============================================================================
-- 1. User Chat Likelihood Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_chat_likelihood (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  likelihood_score DECIMAL(4,3) DEFAULT 0.500, -- 0.000 to 1.000
  last_login_at TIMESTAMP,
  total_chatlings INT DEFAULT 0,
  active_chatlings INT DEFAULT 0,
  runaway_count INT DEFAULT 0,
  chats_last_24h INT DEFAULT 0,
  chats_last_7d INT DEFAULT 0,
  last_chat_at TIMESTAMP,
  days_since_login DECIMAL(5,2) DEFAULT 0,
  hours_since_last_chat DECIMAL(6,2) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_likelihood_score ON user_chat_likelihood(likelihood_score DESC);
CREATE INDEX IF NOT EXISTS idx_chat_likelihood_updated ON user_chat_likelihood(updated_at);

COMMENT ON TABLE user_chat_likelihood IS 'Tracks dynamic probability of conversation generation per user';
COMMENT ON COLUMN user_chat_likelihood.likelihood_score IS 'Calculated probability (0-1) of generating conversation';
COMMENT ON COLUMN user_chat_likelihood.days_since_login IS 'Days since user last logged in';
COMMENT ON COLUMN user_chat_likelihood.hours_since_last_chat IS 'Hours since last conversation occurred';

-- ============================================================================
-- 2. Background Job Stats
-- ============================================================================

ALTER TABLE conversation_generation_log
ADD COLUMN IF NOT EXISTS eligible_users INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS skipped_users INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_likelihood DECIMAL(4,3);

COMMENT ON COLUMN conversation_generation_log.eligible_users IS 'Users with likelihood score > 0';
COMMENT ON COLUMN conversation_generation_log.skipped_users IS 'Users skipped due to low likelihood';
COMMENT ON COLUMN conversation_generation_log.avg_likelihood IS 'Average likelihood score of processed users';

-- ============================================================================
-- 3. Inactivity Topics (Special conversation topics)
-- ============================================================================

CREATE TABLE IF NOT EXISTS inactivity_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_text TEXT NOT NULL,
  min_days_inactive INT DEFAULT 3, -- Minimum days user must be inactive
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inactivity_topics_active ON inactivity_topics(is_active);

COMMENT ON TABLE inactivity_topics IS 'Special topics that appear when user is inactive';

-- Insert inactivity topics
INSERT INTO inactivity_topics (topic_text, min_days_inactive) VALUES
('Where has our architect been lately?', 3),
('Has anyone seen the boss recently?', 3),
('Do you think they forgot about us?', 5),
('I haven''t seen our creator in forever', 5),
('Are we being neglected here?', 7),
('Maybe they abandoned us?', 7),
('I''m starting to feel lonely without them around', 3),
('Remember when they used to visit every day?', 5),
('I wonder if everything is okay with them', 3),
('How long has it been since we last saw them?', 5)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 4. Function to calculate chat likelihood
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_chat_likelihood(p_user_id UUID)
RETURNS DECIMAL(4,3)
LANGUAGE plpgsql
AS $$
DECLARE
  v_score DECIMAL(4,3) := 0.500; -- Base 50%
  v_days_since_login DECIMAL(5,2);
  v_hours_since_chat DECIMAL(6,2);
  v_total_chatlings INT;
  v_active_chatlings INT;
  v_runaway_count INT;
  v_chats_24h INT;
  v_runaway_rate DECIMAL(4,3);
BEGIN
  -- Get user stats
  SELECT
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - COALESCE(u.last_login_at, u.created_at))) / 86400,
    COALESCE(
      (SELECT COUNT(*) FROM user_rewards WHERE user_id = p_user_id),
      0
    ),
    COALESCE(
      (SELECT COUNT(*) FROM runaway_chatlings WHERE user_id = p_user_id AND is_recovered = false),
      0
    )
  INTO v_days_since_login, v_total_chatlings, v_runaway_count
  FROM users u
  WHERE u.id = p_user_id;

  -- If user has no chatlings, no conversations possible
  IF v_total_chatlings < 2 THEN
    RETURN 0.000;
  END IF;

  v_active_chatlings := v_total_chatlings - v_runaway_count;

  -- Factor 1: User activity (40% weight)
  IF v_days_since_login < 1 THEN
    v_score := v_score + 0.200; -- Very active
  ELSIF v_days_since_login < 3 THEN
    v_score := v_score + 0.100; -- Active
  ELSIF v_days_since_login < 7 THEN
    v_score := v_score + 0.050; -- Somewhat active
  ELSE
    v_score := v_score - 0.150; -- Inactive penalty
  END IF;

  -- Factor 2: Chatlings count (25% weight)
  IF v_active_chatlings >= 20 THEN
    v_score := v_score + 0.150;
  ELSIF v_active_chatlings >= 10 THEN
    v_score := v_score + 0.100;
  ELSIF v_active_chatlings >= 5 THEN
    v_score := v_score + 0.050;
  END IF;

  -- Factor 3: Runaways (20% weight)
  IF v_total_chatlings > 0 THEN
    v_runaway_rate := v_runaway_count::DECIMAL / v_total_chatlings;
    IF v_runaway_rate > 0.5 THEN
      v_score := v_score - 0.200; -- More than half left
    ELSIF v_runaway_rate > 0.3 THEN
      v_score := v_score - 0.100;
    END IF;
  END IF;

  -- Factor 4: Recent chat frequency (15% weight)
  SELECT COUNT(*) INTO v_chats_24h
  FROM chatling_conversations
  WHERE user_id = p_user_id
    AND created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours';

  IF v_chats_24h >= 3 THEN
    v_score := v_score - 0.100; -- Too many recent chats
  ELSIF v_chats_24h = 0 THEN
    v_score := v_score + 0.050; -- No recent chats, good time for one
  END IF;

  -- Check time since last chat
  SELECT EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - MAX(created_at))) / 3600
  INTO v_hours_since_chat
  FROM chatling_conversations
  WHERE user_id = p_user_id;

  IF v_hours_since_chat IS NOT NULL THEN
    IF v_hours_since_chat < 2 THEN
      v_score := v_score - 0.150; -- Too soon after last chat
    ELSIF v_hours_since_chat > 12 THEN
      v_score := v_score + 0.100; -- Good spacing
    END IF;
  END IF;

  -- Clamp to 0-1 range
  RETURN GREATEST(0.000, LEAST(1.000, v_score));
END;
$$;

COMMENT ON FUNCTION calculate_chat_likelihood IS 'Calculates dynamic conversation likelihood for a user';

-- ============================================================================
-- Verification
-- ============================================================================

SELECT 'Migration 32 complete!' as status;
SELECT COUNT(*) as inactivity_topics_count FROM inactivity_topics WHERE is_active = true;
