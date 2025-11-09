-- Add many-to-many relationships for traits and body types
-- This allows traits to be assigned to multiple body types

-- ============================================================================
-- STEP 1: Create junction tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS dim_color_scheme_body_types (
    color_scheme_id INTEGER REFERENCES dim_color_scheme(id) ON DELETE CASCADE,
    body_type_id INTEGER REFERENCES dim_body_type(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (color_scheme_id, body_type_id)
);

CREATE TABLE IF NOT EXISTS dim_social_activity_body_types (
    activity_id INTEGER REFERENCES dim_social_activity(id) ON DELETE CASCADE,
    body_type_id INTEGER REFERENCES dim_body_type(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (activity_id, body_type_id)
);

CREATE TABLE IF NOT EXISTS dim_social_mood_body_types (
    mood_id INTEGER REFERENCES dim_social_mood(id) ON DELETE CASCADE,
    body_type_id INTEGER REFERENCES dim_body_type(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (mood_id, body_type_id)
);

CREATE TABLE IF NOT EXISTS dim_special_quirk_body_types (
    quirk_id INTEGER REFERENCES dim_special_quirk(id) ON DELETE CASCADE,
    body_type_id INTEGER REFERENCES dim_body_type(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (quirk_id, body_type_id)
);

-- ============================================================================
-- STEP 2: Migrate existing data
-- ============================================================================

-- Migrate colors
-- NULL body_type_id means ALL cute types (1-8)
INSERT INTO dim_color_scheme_body_types (color_scheme_id, body_type_id)
SELECT cs.id, bt.id
FROM dim_color_scheme cs
CROSS JOIN (SELECT id FROM dim_body_type WHERE id <= 8) bt
WHERE cs.body_type_id IS NULL;

-- Specific body_type_id means just that one type
INSERT INTO dim_color_scheme_body_types (color_scheme_id, body_type_id)
SELECT cs.id, cs.body_type_id
FROM dim_color_scheme cs
WHERE cs.body_type_id IS NOT NULL;

-- Migrate activities
INSERT INTO dim_social_activity_body_types (activity_id, body_type_id)
SELECT sa.id, bt.id
FROM dim_social_activity sa
CROSS JOIN (SELECT id FROM dim_body_type WHERE id <= 8) bt
WHERE sa.body_type_id IS NULL;

INSERT INTO dim_social_activity_body_types (activity_id, body_type_id)
SELECT sa.id, sa.body_type_id
FROM dim_social_activity sa
WHERE sa.body_type_id IS NOT NULL;

-- Migrate moods
INSERT INTO dim_social_mood_body_types (mood_id, body_type_id)
SELECT sm.id, bt.id
FROM dim_social_mood sm
CROSS JOIN (SELECT id FROM dim_body_type WHERE id <= 8) bt
WHERE sm.body_type_id IS NULL;

INSERT INTO dim_social_mood_body_types (mood_id, body_type_id)
SELECT sm.id, sm.body_type_id
FROM dim_social_mood sm
WHERE sm.body_type_id IS NOT NULL;

-- Migrate quirks
INSERT INTO dim_special_quirk_body_types (quirk_id, body_type_id)
SELECT sq.id, bt.id
FROM dim_special_quirk sq
CROSS JOIN (SELECT id FROM dim_body_type WHERE id <= 8) bt
WHERE sq.body_type_id IS NULL;

INSERT INTO dim_special_quirk_body_types (quirk_id, body_type_id)
SELECT sq.id, sq.body_type_id
FROM dim_special_quirk sq
WHERE sq.body_type_id IS NOT NULL;

-- ============================================================================
-- STEP 3: Add indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_color_scheme_bt_color ON dim_color_scheme_body_types(color_scheme_id);
CREATE INDEX IF NOT EXISTS idx_color_scheme_bt_body ON dim_color_scheme_body_types(body_type_id);

CREATE INDEX IF NOT EXISTS idx_activity_bt_activity ON dim_social_activity_body_types(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_bt_body ON dim_social_activity_body_types(body_type_id);

CREATE INDEX IF NOT EXISTS idx_mood_bt_mood ON dim_social_mood_body_types(mood_id);
CREATE INDEX IF NOT EXISTS idx_mood_bt_body ON dim_social_mood_body_types(body_type_id);

CREATE INDEX IF NOT EXISTS idx_quirk_bt_quirk ON dim_special_quirk_body_types(quirk_id);
CREATE INDEX IF NOT EXISTS idx_quirk_bt_body ON dim_special_quirk_body_types(body_type_id);

-- ============================================================================
-- STEP 4: Add comments
-- ============================================================================

COMMENT ON TABLE dim_color_scheme_body_types IS 'Junction table: which color schemes work with which body types';
COMMENT ON TABLE dim_social_activity_body_types IS 'Junction table: which activities work with which body types';
COMMENT ON TABLE dim_social_mood_body_types IS 'Junction table: which moods work with which body types';
COMMENT ON TABLE dim_special_quirk_body_types IS 'Junction table: which quirks work with which body types';

-- ============================================================================
-- Note: We keep the old body_type_id columns for now for backward compatibility
-- They can be dropped in a future migration once all queries are updated
-- ============================================================================
