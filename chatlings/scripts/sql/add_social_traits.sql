-- Social Interaction System (Top Trumps style)
-- 8 social trait categories for chatling personality matching

-- ============================================================================
-- STEP 1: Create social trait categories dimension
-- ============================================================================

CREATE TABLE IF NOT EXISTS dim_social_trait_category (
    id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert 8 social trait categories
INSERT INTO dim_social_trait_category (category_name, description, icon) VALUES
('Persuasion', 'Ability to convince and influence others, charisma and charm', '🗣️'),
('Team Player', 'Works well with others, collaborative and supportive', '🤝'),
('Creativity', 'Imaginative and artistic, thinks outside the box', '🎨'),
('Empathy', 'Understanding and caring, emotionally intelligent', '💝'),
('Energy Level', 'How active and excited they are, enthusiasm and vitality', '⚡'),
('Confidence', 'Self-assured and bold, takes initiative', '💪'),
('Humor', 'Funny and entertaining, brings joy and laughter', '😄'),
('Wisdom', 'Knowledge and insight, thoughtful and reflective', '🧠');

-- ============================================================================
-- STEP 2: Create creature social traits table
-- ============================================================================

CREATE TABLE IF NOT EXISTS creature_social_traits (
    id SERIAL PRIMARY KEY,
    creature_id UUID NOT NULL REFERENCES creatures(id) ON DELETE CASCADE,
    trait_category_id INTEGER NOT NULL REFERENCES dim_social_trait_category(id),
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(creature_id, trait_category_id)
);

-- ============================================================================
-- STEP 3: Create social interactions table (friendships)
-- ============================================================================

CREATE TABLE IF NOT EXISTS creature_friendships (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chatling_1_id UUID NOT NULL REFERENCES creatures(id),
    chatling_2_id UUID NOT NULL REFERENCES creatures(id),
    became_friends BOOLEAN NOT NULL,
    interaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- The 3 categories that were rolled
    category_1_id INTEGER REFERENCES dim_social_trait_category(id),
    category_2_id INTEGER REFERENCES dim_social_trait_category(id),
    category_3_id INTEGER REFERENCES dim_social_trait_category(id),
    -- Scores for each category
    chatling_1_score_1 INTEGER,
    chatling_1_score_2 INTEGER,
    chatling_1_score_3 INTEGER,
    chatling_2_score_1 INTEGER,
    chatling_2_score_2 INTEGER,
    chatling_2_score_3 INTEGER,
    -- Combined score and threshold
    combined_score INTEGER,
    threshold_needed INTEGER,
    -- Narrative text explaining the interaction
    interaction_story TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (chatling_1_id != chatling_2_id)
);

-- ============================================================================
-- STEP 4: Add indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_creature_social_traits_creature ON creature_social_traits(creature_id);
CREATE INDEX IF NOT EXISTS idx_creature_social_traits_category ON creature_social_traits(trait_category_id);

CREATE INDEX IF NOT EXISTS idx_friendships_user ON creature_friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_chatling1 ON creature_friendships(chatling_1_id);
CREATE INDEX IF NOT EXISTS idx_friendships_chatling2 ON creature_friendships(chatling_2_id);
CREATE INDEX IF NOT EXISTS idx_friendships_became_friends ON creature_friendships(became_friends);
CREATE INDEX IF NOT EXISTS idx_friendships_date ON creature_friendships(interaction_date DESC);

-- ============================================================================
-- STEP 5: Add comments
-- ============================================================================

COMMENT ON TABLE dim_social_trait_category IS 'The 8 social trait categories for Top Trumps style interactions';
COMMENT ON TABLE creature_social_traits IS 'Each creature has a score (0-100) in each of the 8 social trait categories';
COMMENT ON TABLE creature_friendships IS 'Records of chatling interactions - tracks whether they became friends or not';

COMMENT ON COLUMN creature_friendships.became_friends IS 'TRUE if combined score exceeded threshold, FALSE otherwise';
COMMENT ON COLUMN creature_friendships.combined_score IS 'Sum of all 6 scores (3 categories × 2 chatlings)';
COMMENT ON COLUMN creature_friendships.threshold_needed IS 'The threshold that needed to be exceeded (e.g., 200 for combined score)';
COMMENT ON COLUMN creature_friendships.interaction_story IS 'Generated narrative explaining why they did or did not become friends';
