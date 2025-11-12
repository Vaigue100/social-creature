-- Migration 21: Map new colors to body types

-- =============================================================================
-- Cute Types: Add gentle, cheerful colors
-- =============================================================================

INSERT INTO dim_color_scheme_body_types (color_scheme_id, body_type_id)
SELECT DISTINCT cs.id, bt.id
FROM dim_color_scheme cs
CROSS JOIN dim_body_type bt
WHERE cs.scheme_name IN (
  'Rose Gold', 'Pearl White', 'Mint Fresh', 'Coral Sunset',
  'Lavender Dream', 'Ivory Cream', 'Ice Crystal'
)
AND bt.body_type_name IN ('Floofs', 'Beanies', 'Blobs', 'Noodles', 'Squishies', 'Spikes', 'Sleeks')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- Athletes: Add energetic, sporty colors
-- =============================================================================

INSERT INTO dim_color_scheme_body_types (color_scheme_id, body_type_id)
SELECT DISTINCT cs.id, bt.id
FROM dim_color_scheme cs
CROSS JOIN dim_body_type bt
WHERE cs.scheme_name IN ('Fire Blaze', 'Ocean Waves', 'Ice Crystal', 'Emerald Green')
AND bt.body_type_name = 'Athletes'
ON CONFLICT DO NOTHING;

-- =============================================================================
-- Knights: Add noble, metallic colors
-- =============================================================================

INSERT INTO dim_color_scheme_body_types (color_scheme_id, body_type_id)
SELECT DISTINCT cs.id, bt.id
FROM dim_color_scheme cs
CROSS JOIN dim_body_type bt
WHERE cs.scheme_name IN (
  'Gold & Shimmer', 'Bronze & Copper', 'Ruby Red', 'Sapphire Blue',
  'Pearl White', 'Emerald Green'
)
AND bt.body_type_name = 'Knights'
ON CONFLICT DO NOTHING;

-- =============================================================================
-- Guardians & Beasts: Add strong, natural colors
-- =============================================================================

INSERT INTO dim_color_scheme_body_types (color_scheme_id, body_type_id)
SELECT DISTINCT cs.id, bt.id
FROM dim_color_scheme cs
CROSS JOIN dim_body_type bt
WHERE cs.scheme_name IN (
  'Bronze & Copper', 'Emerald Green', 'Forest Depths', 'Autumn Leaves',
  'Obsidian Black', 'Ruby Red'
)
AND bt.body_type_name IN ('Guardians', 'Beasts')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- Rangers: Add nature-inspired colors
-- =============================================================================

INSERT INTO dim_color_scheme_body_types (color_scheme_id, body_type_id)
SELECT DISTINCT cs.id, bt.id
FROM dim_color_scheme cs
CROSS JOIN dim_body_type bt
WHERE cs.scheme_name IN (
  'Forest Depths', 'Emerald Green', 'Autumn Leaves', 'Ocean Waves',
  'Mint Fresh', 'Coral Sunset'
)
AND bt.body_type_name = 'Rangers'
ON CONFLICT DO NOTHING;

-- =============================================================================
-- Mages & Spirits: Add mystical, ethereal colors
-- =============================================================================

INSERT INTO dim_color_scheme_body_types (color_scheme_id, body_type_id)
SELECT DISTINCT cs.id, bt.id
FROM dim_color_scheme cs
CROSS JOIN dim_body_type bt
WHERE cs.scheme_name IN (
  'Amethyst Purple', 'Cosmic Galaxy', 'Lavender Dream', 'Sapphire Blue',
  'Rose Gold', 'Pearl White', 'Ice Crystal'
)
AND bt.body_type_name IN ('Mages', 'Spirits')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- Dragons & Titans: Add powerful, dramatic colors
-- =============================================================================

INSERT INTO dim_color_scheme_body_types (color_scheme_id, body_type_id)
SELECT DISTINCT cs.id, bt.id
FROM dim_color_scheme cs
CROSS JOIN dim_body_type bt
WHERE cs.scheme_name IN (
  'Gold & Shimmer', 'Ruby Red', 'Obsidian Black', 'Fire Blaze',
  'Sapphire Blue', 'Emerald Green', 'Amethyst Purple', 'Bronze & Copper'
)
AND bt.body_type_name IN ('Dragons', 'Titans')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- Mechs: Add tech/metallic colors
-- =============================================================================

INSERT INTO dim_color_scheme_body_types (color_scheme_id, body_type_id)
SELECT DISTINCT cs.id, bt.id
FROM dim_color_scheme cs
CROSS JOIN dim_body_type bt
WHERE cs.scheme_name IN (
  'Bronze & Copper', 'Ice Crystal', 'Obsidian Black', 'Gold & Shimmer'
)
AND bt.body_type_name = 'Mechs'
ON CONFLICT DO NOTHING;

-- =============================================================================
-- Gothic: Add dark, mysterious colors
-- =============================================================================

INSERT INTO dim_color_scheme_body_types (color_scheme_id, body_type_id)
SELECT DISTINCT cs.id, bt.id
FROM dim_color_scheme cs
CROSS JOIN dim_body_type bt
WHERE cs.scheme_name IN ('Obsidian Black', 'Shadow & Mystery', 'Amethyst Purple', 'Ruby Red')
AND bt.body_type_name = 'Gothic'
ON CONFLICT DO NOTHING;

-- =============================================================================
-- Robot: Add one tech color
-- =============================================================================

INSERT INTO dim_color_scheme_body_types (color_scheme_id, body_type_id)
SELECT DISTINCT cs.id, bt.id
FROM dim_color_scheme cs
CROSS JOIN dim_body_type bt
WHERE cs.scheme_name IN ('Ice Crystal', 'Gold & Shimmer')
AND bt.body_type_name = 'Robot'
ON CONFLICT DO NOTHING;

-- Show results
SELECT
  bt.body_type_name,
  COUNT(csbt.color_scheme_id) as color_count
FROM dim_body_type bt
LEFT JOIN dim_color_scheme_body_types csbt ON bt.id = csbt.body_type_id
GROUP BY bt.id, bt.body_type_name
ORDER BY bt.id;
