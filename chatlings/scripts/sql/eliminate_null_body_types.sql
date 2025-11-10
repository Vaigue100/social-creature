-- Eliminate NULL body_type_id values by duplicating rows for each cute body type
-- Each NULL row becomes 8 rows (one for each cute body type: IDs 1-8)

-- ============================================================================
-- STEP 1: Remove UNIQUE constraints on name columns (if they exist)
-- ============================================================================

-- Drop unique constraints to allow duplicate names with different body_type_id
ALTER TABLE dim_color_scheme DROP CONSTRAINT IF EXISTS dim_color_scheme_scheme_name_key;
ALTER TABLE dim_social_activity DROP CONSTRAINT IF EXISTS dim_social_activity_activity_name_key;
ALTER TABLE dim_social_mood DROP CONSTRAINT IF EXISTS dim_social_mood_mood_name_key;
ALTER TABLE dim_special_quirk DROP CONSTRAINT IF EXISTS dim_special_quirk_quirk_name_key;

-- Add composite unique constraints instead (name + body_type_id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'dim_color_scheme_name_body_type_unique'
    ) THEN
        ALTER TABLE dim_color_scheme ADD CONSTRAINT dim_color_scheme_name_body_type_unique
            UNIQUE (scheme_name, body_type_id);
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'dim_social_activity_name_body_type_unique'
    ) THEN
        ALTER TABLE dim_social_activity ADD CONSTRAINT dim_social_activity_name_body_type_unique
            UNIQUE (activity_name, body_type_id);
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'dim_social_mood_name_body_type_unique'
    ) THEN
        ALTER TABLE dim_social_mood ADD CONSTRAINT dim_social_mood_name_body_type_unique
            UNIQUE (mood_name, body_type_id);
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'dim_special_quirk_name_body_type_unique'
    ) THEN
        ALTER TABLE dim_special_quirk ADD CONSTRAINT dim_special_quirk_name_body_type_unique
            UNIQUE (quirk_name, body_type_id);
    END IF;
END$$;

-- ============================================================================
-- STEP 2: Duplicate NULL rows for each cute body type (1-8)
-- ============================================================================

-- Color Schemes: Duplicate NULL rows
INSERT INTO dim_color_scheme (scheme_name, prompt_text, body_type_id, created_at)
SELECT
    scheme_name,
    prompt_text,
    bt.id as body_type_id,
    created_at
FROM dim_color_scheme cs
CROSS JOIN (SELECT id FROM dim_body_type WHERE id <= 8) bt
WHERE cs.body_type_id IS NULL;

-- Social Activities: Duplicate NULL rows
INSERT INTO dim_social_activity (activity_name, prompt_text, body_type_id, created_at)
SELECT
    activity_name,
    prompt_text,
    bt.id as body_type_id,
    created_at
FROM dim_social_activity sa
CROSS JOIN (SELECT id FROM dim_body_type WHERE id <= 8) bt
WHERE sa.body_type_id IS NULL;

-- Social Moods: Duplicate NULL rows
INSERT INTO dim_social_mood (mood_name, prompt_text, body_type_id, created_at)
SELECT
    mood_name,
    prompt_text,
    bt.id as body_type_id,
    created_at
FROM dim_social_mood sm
CROSS JOIN (SELECT id FROM dim_body_type WHERE id <= 8) bt
WHERE sm.body_type_id IS NULL;

-- Special Quirks: Duplicate NULL rows
INSERT INTO dim_special_quirk (quirk_name, prompt_text, body_type_id, created_at)
SELECT
    quirk_name,
    prompt_text,
    bt.id as body_type_id,
    created_at
FROM dim_special_quirk sq
CROSS JOIN (SELECT id FROM dim_body_type WHERE id <= 8) bt
WHERE sq.body_type_id IS NULL;

-- ============================================================================
-- STEP 3: Update creature_prompts to reference the new duplicated rows
-- ============================================================================

-- Update color_scheme_id references
UPDATE creature_prompts
SET color_scheme_id = new_cs.id
FROM dim_color_scheme old_cs,
     dim_color_scheme new_cs
WHERE creature_prompts.color_scheme_id = old_cs.id
    AND old_cs.body_type_id IS NULL
    AND old_cs.scheme_name = new_cs.scheme_name
    AND new_cs.body_type_id = creature_prompts.body_type_id;

-- Update activity_id references
UPDATE creature_prompts
SET activity_id = new_sa.id
FROM dim_social_activity old_sa,
     dim_social_activity new_sa
WHERE creature_prompts.activity_id = old_sa.id
    AND old_sa.body_type_id IS NULL
    AND old_sa.activity_name = new_sa.activity_name
    AND new_sa.body_type_id = creature_prompts.body_type_id;

-- Update mood_id references
UPDATE creature_prompts
SET mood_id = new_sm.id
FROM dim_social_mood old_sm,
     dim_social_mood new_sm
WHERE creature_prompts.mood_id = old_sm.id
    AND old_sm.body_type_id IS NULL
    AND old_sm.mood_name = new_sm.mood_name
    AND new_sm.body_type_id = creature_prompts.body_type_id;

-- Update quirk_id references (can be NULL, so handle that)
UPDATE creature_prompts
SET quirk_id = new_sq.id
FROM dim_special_quirk old_sq,
     dim_special_quirk new_sq
WHERE creature_prompts.quirk_id = old_sq.id
    AND old_sq.body_type_id IS NULL
    AND old_sq.quirk_name = new_sq.quirk_name
    AND new_sq.body_type_id = creature_prompts.body_type_id;

-- ============================================================================
-- STEP 4: Delete original NULL rows (now safe since references are updated)
-- ============================================================================

DELETE FROM dim_color_scheme WHERE body_type_id IS NULL;
DELETE FROM dim_social_activity WHERE body_type_id IS NULL;
DELETE FROM dim_social_mood WHERE body_type_id IS NULL;
DELETE FROM dim_special_quirk WHERE body_type_id IS NULL;

-- ============================================================================
-- STEP 5: Add NOT NULL constraints to prevent future NULLs
-- ============================================================================

ALTER TABLE dim_color_scheme ALTER COLUMN body_type_id SET NOT NULL;
ALTER TABLE dim_social_activity ALTER COLUMN body_type_id SET NOT NULL;
ALTER TABLE dim_social_mood ALTER COLUMN body_type_id SET NOT NULL;
ALTER TABLE dim_special_quirk ALTER COLUMN body_type_id SET NOT NULL;

-- ============================================================================
-- STEP 6: Add comments
-- ============================================================================

COMMENT ON TABLE dim_color_scheme IS 'Color schemes for creatures - each scheme duplicated for all applicable body types (no NULLs)';
COMMENT ON TABLE dim_social_activity IS 'Social activities for creatures - each activity duplicated for all applicable body types (no NULLs)';
COMMENT ON TABLE dim_social_mood IS 'Social moods for creatures - each mood duplicated for all applicable body types (no NULLs)';
COMMENT ON TABLE dim_special_quirk IS 'Special quirks for creatures - each quirk duplicated for all applicable body types (no NULLs)';
