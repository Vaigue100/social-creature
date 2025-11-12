-- Migration 18: Map activities, moods, colors, and quirks to all body types

-- =============================================================================
-- CUTE TYPES: Floofs, Beanies, Blobs, Noodles, Squishies, Spikes, Sleeks
-- =============================================================================

-- Cute Activities (fun, cozy, casual)
INSERT INTO dim_social_activity_body_types (activity_id, body_type_id)
SELECT DISTINCT sa.id, bt.id
FROM dim_social_activity sa
CROSS JOIN dim_body_type bt
WHERE sa.activity_name IN (
  'Gaming', 'Doodling', 'Sipping tea', 'Sipping coffee', 'Peeking curiously',
  'Snuggling blanket', 'Munching snacks', 'Celebrating', 'Cheering',
  'Scrolling phone', 'Dancing to music', 'Procrastinating', 'Doing nothing',
  'Stretching & yawning', 'Having lightbulb moment'
)
AND bt.body_type_name IN ('Floofs', 'Beanies', 'Blobs', 'Noodles', 'Squishies', 'Spikes', 'Sleeks')
ON CONFLICT DO NOTHING;

-- Cute Moods
INSERT INTO dim_social_mood_body_types (mood_id, body_type_id)
SELECT DISTINCT sm.id, bt.id
FROM dim_social_mood sm
CROSS JOIN dim_body_type bt
WHERE sm.mood_name IN (
  'Giggly & Silly', 'Content & Happy', 'Sleepy & Cozy', 'Playful & Mischievous',
  'Chill & Relaxed', 'Excited & Bouncy', 'Curious & Exploring'
)
AND bt.body_type_name IN ('Floofs', 'Beanies', 'Blobs', 'Noodles', 'Squishies', 'Spikes', 'Sleeks')
ON CONFLICT DO NOTHING;

-- Cute Colors
INSERT INTO dim_color_scheme_body_types (color_scheme_id, body_type_id)
SELECT DISTINCT cs.id, bt.id
FROM dim_color_scheme cs
CROSS JOIN dim_body_type bt
WHERE cs.scheme_name IN (
  'Pastel Dreams', 'Bright & Poppy', 'Warm & Friendly', 'Rainbow',
  'Vibrant Pink', 'Soft Blues', 'Cozy Neutrals'
)
AND bt.body_type_name IN ('Floofs', 'Beanies', 'Blobs', 'Noodles', 'Squishies', 'Spikes', 'Sleeks')
ON CONFLICT DO NOTHING;

-- Cute Quirks
INSERT INTO dim_special_quirk_body_types (quirk_id, body_type_id)
SELECT DISTINCT sq.id, bt.id
FROM dim_special_quirk sq
CROSS JOIN dim_body_type bt
WHERE sq.quirk_name IN (
  'Has expressive ears', 'Sparkles when happy', 'Wears tiny hat',
  'Carries tiny bag', 'Glows softly', 'Leaves heart trail',
  'With comfort blanket', 'No quirk'
)
AND bt.body_type_name IN ('Floofs', 'Beanies', 'Blobs', 'Noodles', 'Squishies', 'Spikes', 'Sleeks')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- ATHLETES
-- =============================================================================

INSERT INTO dim_social_activity_body_types (activity_id, body_type_id)
SELECT DISTINCT sa.id, bt.id
FROM dim_social_activity sa
CROSS JOIN dim_body_type bt
WHERE sa.activity_name IN (
  'Lifting weights', 'Running on treadmill', 'Doing yoga', 'Stretching at gym',
  'Swimming', 'Playing soccer', 'Playing basketball', 'Playing tennis',
  'Gaming', 'Celebrating', 'Sipping coffee'
)
AND bt.body_type_name = 'Athletes'
ON CONFLICT DO NOTHING;

INSERT INTO dim_social_mood_body_types (mood_id, body_type_id)
SELECT DISTINCT sm.id, bt.id
FROM dim_social_mood sm
CROSS JOIN dim_body_type bt
WHERE sm.mood_name IN (
  'Energetic & Buzzing', 'Focused & Intense', 'Content & Happy',
  'Alert', 'Excited & Bouncy'
)
AND bt.body_type_name = 'Athletes'
ON CONFLICT DO NOTHING;

INSERT INTO dim_color_scheme_body_types (color_scheme_id, body_type_id)
SELECT DISTINCT cs.id, bt.id
FROM dim_color_scheme cs
CROSS JOIN dim_body_type bt
WHERE cs.scheme_name IN (
  'Bright & Poppy', 'Warm & Friendly', 'Cool & Calm',
  'Vibrant Pink', 'Cozy Neutrals'
)
AND bt.body_type_name = 'Athletes'
ON CONFLICT DO NOTHING;

INSERT INTO dim_special_quirk_body_types (quirk_id, body_type_id)
SELECT DISTINCT sq.id, bt.id
FROM dim_special_quirk sq
CROSS JOIN dim_body_type bt
WHERE sq.quirk_name IN (
  'Wearing headphones', 'Holding phone', 'Has tiny glasses',
  'With comfort blanket', 'No quirk'
)
AND bt.body_type_name = 'Athletes'
ON CONFLICT DO NOTHING;

-- =============================================================================
-- KNIGHTS
-- =============================================================================

INSERT INTO dim_social_activity_body_types (activity_id, body_type_id)
SELECT DISTINCT sa.id, bt.id
FROM dim_social_activity sa
CROSS JOIN dim_body_type bt
WHERE sa.activity_name IN (
  'Alert', 'Presenting', 'Teaching', 'Attending meeting',
  'Celebrating', 'Gaming', 'Sipping coffee'
)
AND bt.body_type_name = 'Knights'
ON CONFLICT DO NOTHING;

INSERT INTO dim_social_mood_body_types (mood_id, body_type_id)
SELECT DISTINCT sm.id, bt.id
FROM dim_social_mood sm
CROSS JOIN dim_body_type bt
WHERE sm.mood_name IN (
  'Focused & Intense', 'Alert', 'Content & Happy',
  'Energetic & Buzzing', 'Contemplative'
)
AND bt.body_type_name = 'Knights'
ON CONFLICT DO NOTHING;

INSERT INTO dim_color_scheme_body_types (color_scheme_id, body_type_id)
SELECT DISTINCT cs.id, bt.id
FROM dim_color_scheme cs
CROSS JOIN dim_body_type bt
WHERE cs.scheme_name IN (
  'Metallic Silver', 'Chrome Blue', 'Crimson Red',
  'Dark Gunmetal', 'Cozy Neutrals'
)
AND bt.body_type_name = 'Knights'
ON CONFLICT DO NOTHING;

INSERT INTO dim_special_quirk_body_types (quirk_id, body_type_id)
SELECT DISTINCT sq.id, bt.id
FROM dim_special_quirk sq
CROSS JOIN dim_body_type bt
WHERE sq.quirk_name IN ('No quirk', 'Glows softly', 'Has tiny glasses')
AND bt.body_type_name = 'Knights'
ON CONFLICT DO NOTHING;

-- =============================================================================
-- GUARDIANS & BEASTS
-- =============================================================================

INSERT INTO dim_social_activity_body_types (activity_id, body_type_id)
SELECT DISTINCT sa.id, bt.id
FROM dim_social_activity sa
CROSS JOIN dim_body_type bt
WHERE sa.activity_name IN (
  'Lifting weights', 'Stretching at gym', 'Gaming',
  'Celebrating', 'Alert', 'Doing nothing'
)
AND bt.body_type_name IN ('Guardians', 'Beasts')
ON CONFLICT DO NOTHING;

INSERT INTO dim_social_mood_body_types (mood_id, body_type_id)
SELECT DISTINCT sm.id, bt.id
FROM dim_social_mood sm
CROSS JOIN dim_body_type bt
WHERE sm.mood_name IN (
  'Alert', 'Focused & Intense', 'Content & Happy',
  'Energetic & Buzzing', 'Chill & Relaxed'
)
AND bt.body_type_name IN ('Guardians', 'Beasts')
ON CONFLICT DO NOTHING;

INSERT INTO dim_color_scheme_body_types (color_scheme_id, body_type_id)
SELECT DISTINCT cs.id, bt.id
FROM dim_color_scheme cs
CROSS JOIN dim_body_type bt
WHERE cs.scheme_name IN (
  'Dark Gunmetal', 'Earthy Greens', 'Cozy Neutrals',
  'Grey & Blue', 'Crimson Red'
)
AND bt.body_type_name IN ('Guardians', 'Beasts')
ON CONFLICT DO NOTHING;

INSERT INTO dim_special_quirk_body_types (quirk_id, body_type_id)
SELECT DISTINCT sq.id, bt.id
FROM dim_special_quirk sq
CROSS JOIN dim_body_type bt
WHERE sq.quirk_name IN ('No quirk', 'Has expressive ears', 'Glows softly')
AND bt.body_type_name IN ('Guardians', 'Beasts')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- RANGERS
-- =============================================================================

INSERT INTO dim_social_activity_body_types (activity_id, body_type_id)
SELECT DISTINCT sa.id, bt.id
FROM dim_social_activity sa
CROSS JOIN dim_body_type bt
WHERE sa.activity_name IN (
  'Peeking curiously', 'Watering plants', 'Planting flowers',
  'Relaxing in garden', 'Picking flowers', 'Gaming',
  'Sipping tea', 'Road trip'
)
AND bt.body_type_name = 'Rangers'
ON CONFLICT DO NOTHING;

INSERT INTO dim_social_mood_body_types (mood_id, body_type_id)
SELECT DISTINCT sm.id, bt.id
FROM dim_social_mood sm
CROSS JOIN dim_body_type bt
WHERE sm.mood_name IN (
  'Alert', 'Curious & Exploring', 'Focused & Intense',
  'Content & Happy', 'Chill & Relaxed'
)
AND bt.body_type_name = 'Rangers'
ON CONFLICT DO NOTHING;

INSERT INTO dim_color_scheme_body_types (color_scheme_id, body_type_id)
SELECT DISTINCT cs.id, bt.id
FROM dim_color_scheme cs
CROSS JOIN dim_body_type bt
WHERE cs.scheme_name IN (
  'Earthy Greens', 'Cozy Neutrals', 'Grey & Blue',
  'Cool & Calm', 'Soft Blues'
)
AND bt.body_type_name = 'Rangers'
ON CONFLICT DO NOTHING;

INSERT INTO dim_special_quirk_body_types (quirk_id, body_type_id)
SELECT DISTINCT sq.id, bt.id
FROM dim_special_quirk sq
CROSS JOIN dim_body_type bt
WHERE sq.quirk_name IN (
  'Has tiny glasses', 'Carries tiny bag', 'Wears tiny hat',
  'Has expressive ears', 'No quirk'
)
AND bt.body_type_name = 'Rangers'
ON CONFLICT DO NOTHING;

-- =============================================================================
-- MAGES & SPIRITS
-- =============================================================================

INSERT INTO dim_social_activity_body_types (activity_id, body_type_id)
SELECT DISTINCT sa.id, bt.id
FROM dim_social_activity sa
CROSS JOIN dim_body_type bt
WHERE sa.activity_name IN (
  'Reading Poetry', 'Writing', 'Gazing Mysteriously', 'Brooding',
  'Having lightbulb moment', 'Doodling', 'Sipping tea',
  'Gaming', 'Celebrating'
)
AND bt.body_type_name IN ('Mages', 'Spirits')
ON CONFLICT DO NOTHING;

INSERT INTO dim_social_mood_body_types (mood_id, body_type_id)
SELECT DISTINCT sm.id, bt.id
FROM dim_social_mood sm
CROSS JOIN dim_body_type bt
WHERE sm.mood_name IN (
  'Mysterious', 'Contemplative', 'Focused & Intense',
  'Elegant', 'Chill & Relaxed', 'Content & Happy'
)
AND bt.body_type_name IN ('Mages', 'Spirits')
ON CONFLICT DO NOTHING;

INSERT INTO dim_color_scheme_body_types (color_scheme_id, body_type_id)
SELECT DISTINCT cs.id, bt.id
FROM dim_color_scheme cs
CROSS JOIN dim_body_type bt
WHERE cs.scheme_name IN (
  'Deep Purple', 'Midnight Black', 'Soft Blues',
  'Rainbow', 'Victorian Plum', 'Pastel Dreams'
)
AND bt.body_type_name IN ('Mages', 'Spirits')
ON CONFLICT DO NOTHING;

INSERT INTO dim_special_quirk_body_types (quirk_id, body_type_id)
SELECT DISTINCT sq.id, bt.id
FROM dim_special_quirk sq
CROSS JOIN dim_body_type bt
WHERE sq.quirk_name IN (
  'Glows softly', 'Sparkles when happy', 'Has tiny glasses',
  'Wears tiny hat', 'No quirk'
)
AND bt.body_type_name IN ('Mages', 'Spirits')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- DRAGONS & TITANS
-- =============================================================================

INSERT INTO dim_social_activity_body_types (activity_id, body_type_id)
SELECT DISTINCT sa.id, bt.id
FROM dim_social_activity sa
CROSS JOIN dim_body_type bt
WHERE sa.activity_name IN (
  'Celebrating', 'Gaming', 'Hovering', 'Gazing Mysteriously',
  'Doing nothing', 'Brooding'
)
AND bt.body_type_name IN ('Dragons', 'Titans')
ON CONFLICT DO NOTHING;

INSERT INTO dim_social_mood_body_types (mood_id, body_type_id)
SELECT DISTINCT sm.id, bt.id
FROM dim_social_mood sm
CROSS JOIN dim_body_type bt
WHERE sm.mood_name IN (
  'Alert', 'Focused & Intense', 'Dramatic',
  'Mysterious', 'Content & Happy'
)
AND bt.body_type_name IN ('Dragons', 'Titans')
ON CONFLICT DO NOTHING;

INSERT INTO dim_color_scheme_body_types (color_scheme_id, body_type_id)
SELECT DISTINCT cs.id, bt.id
FROM dim_color_scheme cs
CROSS JOIN dim_body_type bt
WHERE cs.scheme_name IN (
  'Crimson Red', 'Deep Purple', 'Metallic Silver',
  'Dark Gunmetal', 'Midnight Black', 'Rainbow'
)
AND bt.body_type_name IN ('Dragons', 'Titans')
ON CONFLICT DO NOTHING;

INSERT INTO dim_special_quirk_body_types (quirk_id, body_type_id)
SELECT DISTINCT sq.id, bt.id
FROM dim_special_quirk sq
CROSS JOIN dim_body_type bt
WHERE sq.quirk_name IN ('No quirk', 'Glows softly', 'Sparkles when happy')
AND bt.body_type_name IN ('Dragons', 'Titans')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- MECHS
-- =============================================================================

INSERT INTO dim_social_activity_body_types (activity_id, body_type_id)
SELECT DISTINCT sa.id, bt.id
FROM dim_social_activity sa
CROSS JOIN dim_body_type bt
WHERE sa.activity_name IN (
  'Computing', 'Scanning', 'Recharging', 'Hovering',
  'Typing on laptop', 'Gaming', 'Alert'
)
AND bt.body_type_name = 'Mechs'
ON CONFLICT DO NOTHING;

INSERT INTO dim_social_mood_body_types (mood_id, body_type_id)
SELECT DISTINCT sm.id, bt.id
FROM dim_social_mood sm
CROSS JOIN dim_body_type bt
WHERE sm.mood_name IN (
  'Analytical', 'Processing', 'Alert', 'Low Battery',
  'Focused & Intense', 'Content & Happy'
)
AND bt.body_type_name = 'Mechs'
ON CONFLICT DO NOTHING;

INSERT INTO dim_color_scheme_body_types (color_scheme_id, body_type_id)
SELECT DISTINCT cs.id, bt.id
FROM dim_color_scheme cs
CROSS JOIN dim_body_type bt
WHERE cs.scheme_name IN (
  'Metallic Silver', 'Chrome Blue', 'Neon Tech',
  'Dark Gunmetal', 'Grey & Blue'
)
AND bt.body_type_name = 'Mechs'
ON CONFLICT DO NOTHING;

INSERT INTO dim_special_quirk_body_types (quirk_id, body_type_id)
SELECT DISTINCT sq.id, bt.id
FROM dim_special_quirk sq
CROSS JOIN dim_body_type bt
WHERE sq.quirk_name IN (
  'Antenna Array', 'Circuit Display', 'LED Panel',
  'Mechanical Joints', 'Glows softly', 'No quirk'
)
AND bt.body_type_name = 'Mechs'
ON CONFLICT DO NOTHING;

-- Show final counts
SELECT 'Dimension Mappings Added' as status;
SELECT
  bt.body_type_name,
  (SELECT COUNT(*) FROM dim_size_category_body_types WHERE body_type_id = bt.id) as sizes,
  (SELECT COUNT(*) FROM dim_social_activity_body_types WHERE body_type_id = bt.id) as activities,
  (SELECT COUNT(*) FROM dim_social_mood_body_types WHERE body_type_id = bt.id) as moods,
  (SELECT COUNT(*) FROM dim_color_scheme_body_types WHERE body_type_id = bt.id) as colors,
  (SELECT COUNT(*) FROM dim_special_quirk_body_types WHERE body_type_id = bt.id) as quirks
FROM dim_body_type bt
ORDER BY bt.id;
