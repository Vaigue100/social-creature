-- Migration 30v2: Procedural Chat System
-- Chatlings have conversations that emerge from pre-approved chat lines and flow rules

-- Core chat line library (all pre-approved messages)
CREATE TABLE chat_lines (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL, -- The actual message

    -- Who would say this
    personality_filter JSONB, -- e.g., {"adventurous": true, "shy": false} - null means anyone

    -- Conversation flow
    line_type VARCHAR(50) NOT NULL, -- 'starter', 'agreement', 'disagreement', 'neutral', 'question', 'answer', 'closer'
    responds_to VARCHAR(50)[], -- Which line_types this can respond to (null for starters)
    can_end_conversation BOOLEAN DEFAULT false, -- Can this line end the conversation organically?

    -- Sentiment for mood tracking
    sentiment VARCHAR(20) NOT NULL, -- 'positive', 'negative', 'neutral'
    intensity INT DEFAULT 1, -- 1-3, affects mood impact

    -- Topic relevance (optional filtering)
    topic_tags TEXT[], -- e.g., ['pets', 'hobbies', 'food'] - null means works for any topic

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conversation flow rules (what line types can follow what)
CREATE TABLE chat_flow_rules (
    id SERIAL PRIMARY KEY,
    from_type VARCHAR(50) NOT NULL, -- Previous line type
    to_type VARCHAR(50) NOT NULL, -- Allowed next line type
    weight INT DEFAULT 1, -- Probability weight (higher = more likely)
    min_turn INT DEFAULT 0, -- Minimum turn number for this transition
    max_turn INT DEFAULT 999, -- Maximum turn number for this transition

    UNIQUE(from_type, to_type)
);

-- Active conversations (current state for each user)
CREATE TABLE active_conversations (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Conversation participants
    topic_id UUID REFERENCES trending_topics(id),
    participants JSONB NOT NULL, -- [{creature_id, name, traits}]

    -- Current state
    current_turn INT DEFAULT 0,
    last_speaker_index INT, -- Index in participants array
    last_line_type VARCHAR(50), -- What type of line was just said

    -- Mood tracking during conversation
    sentiment_scores JSONB DEFAULT '{}', -- {creature_id: cumulative_score}

    -- Message history (for audit logging when conversation ends)
    messages JSONB DEFAULT '[]', -- [{turn, speaker, text, lineType}]

    -- Timestamps
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Only one active conversation per user
    UNIQUE(user_id)
);

-- Conversation audit log (for testing and debugging)
-- Stores recent conversations so we can review for nonsense
CREATE TABLE conversation_audit_log (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    topic TEXT,
    participants JSONB, -- [{creature_id, name}]

    -- The full conversation as it emerged
    messages JSONB NOT NULL, -- [{speaker, text, line_type, turn}]

    -- Outcomes
    mood_changes JSONB, -- {creature_id: {before, after, reason}}

    -- Quality flags (for review)
    flagged_nonsense BOOLEAN DEFAULT false,
    admin_notes TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for rolling cleanup (keep last 1000 conversations)
CREATE INDEX idx_audit_log_created ON conversation_audit_log(created_at DESC);

-- Add mood tracking to user_rewards if not exists
-- (Assuming this exists from earlier migrations, but adding for clarity)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'user_rewards'
                   AND column_name = 'mood_status') THEN
        ALTER TABLE user_rewards
        ADD COLUMN mood_status VARCHAR(20) DEFAULT 'neutral',
        ADD COLUMN unhappy_count INT DEFAULT 0;
    END IF;
END $$;

-- Trending topics table already exists from earlier migration
-- Using existing table with columns: id (UUID), topic_text, category, is_active, etc.

-- Runaway chatlings table
CREATE TABLE IF NOT EXISTS runaway_chatlings (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    creature_id UUID REFERENCES creatures(id),

    -- Why they left
    final_mood_status VARCHAR(20),
    unhappy_count INT,

    -- Recovery mechanics
    recovery_difficulty VARCHAR(20) DEFAULT 'normal', -- 'easy', 'normal', 'hard'
    recovery_attempts INT DEFAULT 0,

    ran_away_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recovered_at TIMESTAMP,

    UNIQUE(user_id, creature_id)
);

-- Indexes for performance
CREATE INDEX idx_active_conversations_user ON active_conversations(user_id);
CREATE INDEX idx_active_conversations_activity ON active_conversations(last_activity);
CREATE INDEX idx_chat_lines_type ON chat_lines(line_type);
CREATE INDEX idx_chat_lines_responds_to ON chat_lines USING GIN(responds_to);
CREATE INDEX idx_runaway_chatlings_user ON runaway_chatlings(user_id) WHERE recovered_at IS NULL;

-- Sample chat lines (starter set)
INSERT INTO chat_lines (text, line_type, responds_to, sentiment, personality_filter) VALUES
-- Starters (begin conversations)
('I''ve been thinking about this topic a lot lately...', 'starter', NULL, 'neutral', NULL),
('Oh wow, I have strong feelings about this!', 'starter', NULL, 'positive', '{"energetic": true}'),
('Hmm, this is interesting...', 'starter', NULL, 'neutral', '{"curious": true}'),

-- Agreements
('I totally agree with that!', 'agreement', ARRAY['starter', 'agreement', 'answer'], 'positive', NULL),
('Yes! Exactly what I was thinking!', 'agreement', ARRAY['starter', 'agreement'], 'positive', '{"energetic": true}'),
('You make a really good point.', 'agreement', ARRAY['starter', 'answer'], 'positive', NULL),
('I feel the same way!', 'agreement', ARRAY['starter', 'agreement'], 'positive', NULL),

-- Disagreements
('I don''t know about that...', 'disagreement', ARRAY['starter', 'agreement', 'answer'], 'negative', NULL),
('Really? I completely disagree.', 'disagreement', ARRAY['starter', 'agreement'], 'negative', '{"bold": true}'),
('That''s not how I see it at all.', 'disagreement', ARRAY['starter', 'answer'], 'negative', NULL),
('I think you''re wrong about this.', 'disagreement', ARRAY['starter', 'agreement'], 'negative', '{"bold": true}'),

-- Neutral/Bridge responses
('I can see both sides of this.', 'neutral', ARRAY['disagreement', 'agreement'], 'neutral', NULL),
('Interesting perspective...', 'neutral', ARRAY['starter', 'disagreement'], 'neutral', NULL),
('Let me think about that.', 'neutral', ARRAY['starter', 'question'], 'neutral', '{"thoughtful": true}'),

-- Questions (keep conversation going)
('What makes you say that?', 'question', ARRAY['starter', 'agreement', 'disagreement'], 'neutral', NULL),
('But have you considered the other side?', 'question', ARRAY['agreement'], 'neutral', NULL),
('Why do you think that is?', 'question', ARRAY['starter', 'disagreement'], 'neutral', NULL),

-- Answers (to questions)
('Well, from my experience...', 'answer', ARRAY['question'], 'neutral', NULL),
('I just feel like it''s obvious, you know?', 'answer', ARRAY['question'], 'neutral', '{"confident": true}'),
('I hadn''t thought of it that way before.', 'answer', ARRAY['question'], 'positive', NULL),

-- Closers (can end conversation naturally)
('Well, I think we''ve covered it.', 'closer', ARRAY['agreement', 'neutral', 'answer'], 'neutral', NULL),
('Fair enough, I guess.', 'closer', ARRAY['disagreement', 'neutral'], 'neutral', NULL),
('Anyway, something to think about.', 'closer', ARRAY['agreement', 'neutral', 'answer'], 'neutral', NULL);

-- Update closers to be able to end conversations
UPDATE chat_lines SET can_end_conversation = true WHERE line_type = 'closer';

-- Sample flow rules
INSERT INTO chat_flow_rules (from_type, to_type, weight, min_turn, max_turn) VALUES
-- Early conversation (turns 1-3)
('starter', 'agreement', 5, 1, 3),
('starter', 'disagreement', 5, 1, 3),
('starter', 'neutral', 3, 1, 3),
('starter', 'question', 2, 1, 3),

-- Mid conversation (turn 2+)
('agreement', 'agreement', 4, 2, 999), -- Agreement chains
('agreement', 'question', 3, 2, 999),
('agreement', 'closer', 2, 3, 999), -- Can start wrapping up after turn 3

('disagreement', 'disagreement', 2, 2, 5), -- Some conflict is ok
('disagreement', 'neutral', 4, 2, 999), -- De-escalate
('disagreement', 'question', 3, 2, 999),
('disagreement', 'answer', 3, 2, 999),

('neutral', 'agreement', 3, 2, 999),
('neutral', 'disagreement', 3, 2, 999),
('neutral', 'closer', 4, 3, 999),

('question', 'answer', 8, 2, 999), -- Questions usually get answers
('question', 'neutral', 2, 2, 999),

('answer', 'agreement', 4, 2, 999),
('answer', 'disagreement', 3, 2, 999),
('answer', 'question', 3, 2, 999);

-- Cleanup job for audit log (keep last 1000)
-- This should be run periodically via cron or background job
COMMENT ON TABLE conversation_audit_log IS 'Stores recent conversations for quality review. Periodically delete rows keeping only last 1000: DELETE FROM conversation_audit_log WHERE id NOT IN (SELECT id FROM conversation_audit_log ORDER BY created_at DESC LIMIT 1000)';
