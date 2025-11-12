-- Migration 19: Deduplicate dimension tables and remove body_type_id columns
-- The dim tables should NOT have body_type_id - that's what junction tables are for

-- =============================================================================
-- Step 1: Create temporary tables with deduplicated data
-- =============================================================================

-- Deduplicate activities
CREATE TEMP TABLE temp_activities AS
SELECT DISTINCT ON (activity_name)
  activity_name,
  prompt_text,
  created_at
FROM dim_social_activity
ORDER BY activity_name, id;

-- Deduplicate moods
CREATE TEMP TABLE temp_moods AS
SELECT DISTINCT ON (mood_name)
  mood_name,
  prompt_text,
  created_at
FROM dim_social_mood
ORDER BY mood_name, id;

-- Deduplicate colors
CREATE TEMP TABLE temp_colors AS
SELECT DISTINCT ON (scheme_name)
  scheme_name,
  prompt_text,
  created_at
FROM dim_color_scheme
ORDER BY scheme_name, id;

-- Deduplicate quirks
CREATE TEMP TABLE temp_quirks AS
SELECT DISTINCT ON (quirk_name)
  quirk_name,
  prompt_text,
  created_at
FROM dim_special_quirk
ORDER BY quirk_name, id;

-- =============================================================================
-- Step 2: Rebuild junction tables with deduplicated data
-- =============================================================================

-- For activities: rebuild with unique dimension names
CREATE TEMP TABLE new_activity_links AS
SELECT DISTINCT
  (SELECT id FROM dim_social_activity WHERE activity_name = sa.activity_name ORDER BY id LIMIT 1) as activity_id,
  sabt.body_type_id
FROM dim_social_activity_body_types sabt
JOIN dim_social_activity sa ON sa.id = sabt.activity_id;

-- Clear and repopulate activity links
DELETE FROM dim_social_activity_body_types;
INSERT INTO dim_social_activity_body_types (activity_id, body_type_id)
SELECT DISTINCT activity_id, body_type_id FROM new_activity_links;

-- For moods
CREATE TEMP TABLE new_mood_links AS
SELECT DISTINCT
  (SELECT id FROM dim_social_mood WHERE mood_name = sm.mood_name ORDER BY id LIMIT 1) as mood_id,
  smbt.body_type_id
FROM dim_social_mood_body_types smbt
JOIN dim_social_mood sm ON sm.id = smbt.mood_id;

DELETE FROM dim_social_mood_body_types;
INSERT INTO dim_social_mood_body_types (mood_id, body_type_id)
SELECT DISTINCT mood_id, body_type_id FROM new_mood_links;

-- For colors
CREATE TEMP TABLE new_color_links AS
SELECT DISTINCT
  (SELECT id FROM dim_color_scheme WHERE scheme_name = cs.scheme_name ORDER BY id LIMIT 1) as color_scheme_id,
  csbt.body_type_id
FROM dim_color_scheme_body_types csbt
JOIN dim_color_scheme cs ON cs.id = csbt.color_scheme_id;

DELETE FROM dim_color_scheme_body_types;
INSERT INTO dim_color_scheme_body_types (color_scheme_id, body_type_id)
SELECT DISTINCT color_scheme_id, body_type_id FROM new_color_links;

-- For quirks
CREATE TEMP TABLE new_quirk_links AS
SELECT DISTINCT
  (SELECT id FROM dim_special_quirk WHERE quirk_name = sq.quirk_name ORDER BY id LIMIT 1) as quirk_id,
  sqbt.body_type_id
FROM dim_special_quirk_body_types sqbt
JOIN dim_special_quirk sq ON sq.id = sqbt.quirk_id;

DELETE FROM dim_special_quirk_body_types;
INSERT INTO dim_special_quirk_body_types (quirk_id, body_type_id)
SELECT DISTINCT quirk_id, body_type_id FROM new_quirk_links;

-- =============================================================================
-- Step 3: Update creature_prompts table to use kept IDs
-- =============================================================================

-- Update activity IDs in creature_prompts
UPDATE creature_prompts cp
SET activity_id = (
  SELECT id FROM dim_social_activity
  WHERE activity_name = (SELECT activity_name FROM dim_social_activity WHERE id = cp.activity_id)
  ORDER BY id LIMIT 1
)
WHERE activity_id IS NOT NULL;

-- Update mood IDs
UPDATE creature_prompts cp
SET mood_id = (
  SELECT id FROM dim_social_mood
  WHERE mood_name = (SELECT mood_name FROM dim_social_mood WHERE id = cp.mood_id)
  ORDER BY id LIMIT 1
)
WHERE mood_id IS NOT NULL;

-- Update color IDs
UPDATE creature_prompts cp
SET color_scheme_id = (
  SELECT id FROM dim_color_scheme
  WHERE scheme_name = (SELECT scheme_name FROM dim_color_scheme WHERE id = cp.color_scheme_id)
  ORDER BY id LIMIT 1
)
WHERE color_scheme_id IS NOT NULL;

-- Update quirk IDs
UPDATE creature_prompts cp
SET quirk_id = (
  SELECT id FROM dim_special_quirk
  WHERE quirk_name = (SELECT quirk_name FROM dim_special_quirk WHERE id = cp.quirk_id)
  ORDER BY id LIMIT 1
)
WHERE quirk_id IS NOT NULL;

-- =============================================================================
-- Step 4: Delete duplicates from dim tables
-- =============================================================================

-- Keep only the first occurrence of each unique name
DELETE FROM dim_social_activity
WHERE id NOT IN (
  SELECT MIN(id) FROM dim_social_activity GROUP BY activity_name
);

DELETE FROM dim_social_mood
WHERE id NOT IN (
  SELECT MIN(id) FROM dim_social_mood GROUP BY mood_name
);

DELETE FROM dim_color_scheme
WHERE id NOT IN (
  SELECT MIN(id) FROM dim_color_scheme GROUP BY scheme_name
);

DELETE FROM dim_special_quirk
WHERE id NOT IN (
  SELECT MIN(id) FROM dim_special_quirk GROUP BY quirk_name
);

-- =============================================================================
-- Step 5: Remove body_type_id columns from dim tables
-- =============================================================================

ALTER TABLE dim_social_activity DROP COLUMN IF EXISTS body_type_id;
ALTER TABLE dim_social_mood DROP COLUMN IF EXISTS body_type_id;
ALTER TABLE dim_color_scheme DROP COLUMN IF EXISTS body_type_id;
ALTER TABLE dim_special_quirk DROP COLUMN IF EXISTS body_type_id;

-- Show results
SELECT 'Deduplication Complete' as status;
SELECT 'Activities' as table_name, COUNT(*) as count FROM dim_social_activity
UNION ALL
SELECT 'Moods', COUNT(*) FROM dim_social_mood
UNION ALL
SELECT 'Colors', COUNT(*) FROM dim_color_scheme
UNION ALL
SELECT 'Quirks', COUNT(*) FROM dim_special_quirk;
