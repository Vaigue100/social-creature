-- Migration 17: Expand dimensions with new body types, sizes, and size-body type relationships

-- =============================================================================
-- Add New Body Types (Heroic and Varied)
-- =============================================================================

INSERT INTO dim_body_type (body_type_name, prompt_text) VALUES
('Knights', 'noble armored creature with shield and sword'),
('Guardians', 'large protective creature with muscular build'),
('Rangers', 'swift agile creature built for speed and stealth'),
('Mages', 'mystical creature with flowing robes and magical aura'),
('Dragons', 'majestic scaled creature with wings'),
('Beasts', 'wild powerful creature with fierce features'),
('Mechs', 'large mechanical creature with heavy armor'),
('Spirits', 'ethereal glowing creature with translucent form'),
('Titans', 'massive imposing creature towering in size')
ON CONFLICT (body_type_name) DO NOTHING;

-- =============================================================================
-- Add New Size Categories (Beyond Just Small)
-- =============================================================================

INSERT INTO dim_size_category (size_name, prompt_text) VALUES
('Regular', 'standard medium-sized'),
('Tall', 'above average height'),
('Hulking', 'large and imposing'),
('Giant', 'massive towering'),
('Colossal', 'unbelievably enormous')
ON CONFLICT (size_name) DO NOTHING;

-- =============================================================================
-- Create Size-Body Type Junction Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS dim_size_category_body_types (
    size_id INTEGER REFERENCES dim_size_category(id) ON DELETE CASCADE,
    body_type_id INTEGER REFERENCES dim_body_type(id) ON DELETE CASCADE,
    PRIMARY KEY (size_id, body_type_id)
);

-- =============================================================================
-- Map Sizes to Body Types (Which sizes make sense for which body types)
-- =============================================================================

-- Cute body types work with small sizes
INSERT INTO dim_size_category_body_types (size_id, body_type_id)
SELECT s.id, bt.id
FROM dim_size_category s
CROSS JOIN dim_body_type bt
WHERE s.size_name IN ('Pocket-sized', 'Desktop Buddy', 'Lap Companion', 'Cushion Friend')
  AND bt.body_type_name IN ('Floofs', 'Beanies', 'Blobs', 'Noodles', 'Squishies', 'Spikes', 'Sleeks')
ON CONFLICT DO NOTHING;

-- Athletic/Regular creatures work with regular and tall sizes
INSERT INTO dim_size_category_body_types (size_id, body_type_id)
SELECT s.id, bt.id
FROM dim_size_category s
CROSS JOIN dim_body_type bt
WHERE s.size_name IN ('Regular', 'Tall')
  AND bt.body_type_name IN ('Athletes', 'Knights', 'Rangers', 'Mages', 'Spirits')
ON CONFLICT DO NOTHING;

-- Powerful creatures work with hulking and large sizes
INSERT INTO dim_size_category_body_types (size_id, body_type_id)
SELECT s.id, bt.id
FROM dim_size_category s
CROSS JOIN dim_body_type bt
WHERE s.size_name IN ('Hulking', 'Giant')
  AND bt.body_type_name IN ('Guardians', 'Beasts', 'Mechs', 'Dragons', 'Zombie', 'Gothic')
ON CONFLICT DO NOTHING;

-- Titans and dragons can be colossal
INSERT INTO dim_size_category_body_types (size_id, body_type_id)
SELECT s.id, bt.id
FROM dim_size_category s
CROSS JOIN dim_body_type bt
WHERE s.size_name IN ('Colossal')
  AND bt.body_type_name IN ('Titans', 'Dragons', 'Mechs')
ON CONFLICT DO NOTHING;

-- Robots work with multiple sizes
INSERT INTO dim_size_category_body_types (size_id, body_type_id)
SELECT s.id, bt.id
FROM dim_size_category s
CROSS JOIN dim_body_type bt
WHERE s.size_name IN ('Desktop Buddy', 'Regular', 'Hulking')
  AND bt.body_type_name = 'Robot'
ON CONFLICT DO NOTHING;

-- Show results
SELECT 'Body Types' as table_name, COUNT(*) as count FROM dim_body_type
UNION ALL
SELECT 'Size Categories', COUNT(*) FROM dim_size_category
UNION ALL
SELECT 'Size-Body Type Links', COUNT(*) FROM dim_size_category_body_types;
