-- Chatlings Data Import Script
-- Imports all CSV data into PostgreSQL database

\c chatlings;

-- Set client encoding
SET CLIENT_ENCODING TO 'UTF8';

-- ============================================================================
-- IMPORT DIMENSION DATA
-- ============================================================================

-- Import colourings
COPY dim_colouring(colouring_name)
FROM 'C:/Users/Barney/Social Creature/chatlings/data/dim_colourings.csv'
WITH (FORMAT csv, HEADER true, ENCODING 'UTF8');

-- Import styles
COPY dim_style(style_name)
FROM 'C:/Users/Barney/Social Creature/chatlings/data/dim_styles.csv'
WITH (FORMAT csv, HEADER true, ENCODING 'UTF8');

-- Import moods
COPY dim_mood(mood_name)
FROM 'C:/Users/Barney/Social Creature/chatlings/data/dim_moods.csv'
WITH (FORMAT csv, HEADER true, ENCODING 'UTF8');

-- Import motion types
COPY dim_motion_type(motion_name)
FROM 'C:/Users/Barney/Social Creature/chatlings/data/dim_motion_types.csv'
WITH (FORMAT csv, HEADER true, ENCODING 'UTF8');

-- Import elemental affinities
COPY dim_elemental_affinity(affinity_name)
FROM 'C:/Users/Barney/Social Creature/chatlings/data/dim_elemental_affinities.csv'
WITH (FORMAT csv, HEADER true, ENCODING 'UTF8');

-- Import environments
COPY dim_environment(environment_name)
FROM 'C:/Users/Barney/Social Creature/chatlings/data/dim_environments.csv'
WITH (FORMAT csv, HEADER true, ENCODING 'UTF8');

-- Import species (needs special handling for category)
CREATE TEMP TABLE temp_species (
    category VARCHAR(50),
    species VARCHAR(100)
);

COPY temp_species
FROM 'C:/Users/Barney/Social Creature/chatlings/data/dim_species.csv'
WITH (FORMAT csv, HEADER true, ENCODING 'UTF8');

INSERT INTO dim_species (species_name, category)
SELECT DISTINCT species, category FROM temp_species;

DROP TABLE temp_species;

-- Import subspecies (needs to link to species)
CREATE TEMP TABLE temp_subspecies (
    category VARCHAR(50),
    species VARCHAR(100),
    subspecies VARCHAR(100)
);

COPY temp_subspecies
FROM 'C:/Users/Barney/Social Creature/chatlings/data/dim_subspecies.csv'
WITH (FORMAT csv, HEADER true, ENCODING 'UTF8');

INSERT INTO dim_subspecies (subspecies_name, species_id)
SELECT ts.subspecies, ds.id
FROM temp_subspecies ts
JOIN dim_species ds ON ts.species = ds.species_name;

DROP TABLE temp_subspecies;

-- ============================================================================
-- IMPORT LORE DATA
-- ============================================================================

-- Import game lore
COPY lore_game(title, content, lore_type, sort_order)
FROM 'C:/Users/Barney/Social Creature/chatlings/data/lore_game.csv'
WITH (FORMAT csv, HEADER true, ENCODING 'UTF8');

-- Import species lore
CREATE TEMP TABLE temp_lore_species (
    category VARCHAR(50),
    species VARCHAR(100),
    title VARCHAR(255),
    content TEXT
);

COPY temp_lore_species
FROM 'C:/Users/Barney/Social Creature/chatlings/data/lore_species.csv'
WITH (FORMAT csv, HEADER true, ENCODING 'UTF8');

INSERT INTO lore_species (species_id, title, content)
SELECT ds.id, tls.title, tls.content
FROM temp_lore_species tls
JOIN dim_species ds ON tls.species = ds.species_name;

DROP TABLE temp_lore_species;

-- ============================================================================
-- IMPORT CREATURES DATA
-- ============================================================================

-- Create temporary table for creature import
CREATE TEMP TABLE temp_creatures (
    id INTEGER,
    creature_name VARCHAR(255),
    category VARCHAR(50),
    species VARCHAR(100),
    subspecies VARCHAR(100),
    colouring VARCHAR(100),
    style VARCHAR(100),
    mood VARCHAR(100),
    motion_type VARCHAR(100),
    elemental_affinity VARCHAR(100),
    environment VARCHAR(100)
);

COPY temp_creatures
FROM 'C:/Users/Barney/Social Creature/chatlings/data/all_creatures.csv'
WITH (FORMAT csv, HEADER true, ENCODING 'UTF8');

-- Insert creatures with proper foreign key references
INSERT INTO creatures (
    creature_name,
    species_id,
    subspecies_id,
    colouring_id,
    style_id,
    mood_id,
    motion_type_id,
    elemental_affinity_id,
    environment_id,
    rarity_tier,
    is_active
)
SELECT
    tc.creature_name,
    ds.id as species_id,
    dss.id as subspecies_id,
    dc.id as colouring_id,
    dst.id as style_id,
    dm.id as mood_id,
    dmt.id as motion_type_id,
    dea.id as elemental_affinity_id,
    de.id as environment_id,
    'Common' as rarity_tier,  -- Default rarity, can be updated later
    true as is_active
FROM temp_creatures tc
LEFT JOIN dim_species ds ON tc.species = ds.species_name
LEFT JOIN dim_subspecies dss ON tc.subspecies = dss.subspecies_name
LEFT JOIN dim_colouring dc ON tc.colouring = dc.colouring_name
LEFT JOIN dim_style dst ON tc.style = dst.style_name
LEFT JOIN dim_mood dm ON tc.mood = dm.mood_name
LEFT JOIN dim_motion_type dmt ON tc.motion_type = dmt.motion_name
LEFT JOIN dim_elemental_affinity dea ON tc.elemental_affinity = dea.affinity_name
LEFT JOIN dim_environment de ON tc.environment = de.environment_name
ON CONFLICT (subspecies_id, colouring_id, style_id, mood_id, motion_type_id, elemental_affinity_id, environment_id)
DO NOTHING;

DROP TABLE temp_creatures;

-- ============================================================================
-- UPDATE RARITY SCORES
-- ============================================================================

-- Calculate rarity based on dimension combinations
-- This is a simple algorithm - can be refined later
UPDATE creatures SET rarity_score = RANDOM() * 100;

UPDATE creatures SET rarity_tier =
    CASE
        WHEN rarity_score >= 99 THEN 'Legendary'
        WHEN rarity_score >= 95 THEN 'Epic'
        WHEN rarity_score >= 85 THEN 'Rare'
        WHEN rarity_score >= 60 THEN 'Uncommon'
        ELSE 'Common'
    END;

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT 'Dimension Tables' as category, COUNT(*) as count FROM dim_species
UNION ALL
SELECT 'Subspecies', COUNT(*) FROM dim_subspecies
UNION ALL
SELECT 'Colourings', COUNT(*) FROM dim_colouring
UNION ALL
SELECT 'Styles', COUNT(*) FROM dim_style
UNION ALL
SELECT 'Moods', COUNT(*) FROM dim_mood
UNION ALL
SELECT 'Motion Types', COUNT(*) FROM dim_motion_type
UNION ALL
SELECT 'Elemental Affinities', COUNT(*) FROM dim_elemental_affinity
UNION ALL
SELECT 'Environments', COUNT(*) FROM dim_environment
UNION ALL
SELECT 'Game Lore', COUNT(*) FROM lore_game
UNION ALL
SELECT 'Species Lore', COUNT(*) FROM lore_species
UNION ALL
SELECT 'Total Creatures', COUNT(*) FROM creatures
UNION ALL
SELECT 'Common', COUNT(*) FROM creatures WHERE rarity_tier = 'Common'
UNION ALL
SELECT 'Uncommon', COUNT(*) FROM creatures WHERE rarity_tier = 'Uncommon'
UNION ALL
SELECT 'Rare', COUNT(*) FROM creatures WHERE rarity_tier = 'Rare'
UNION ALL
SELECT 'Epic', COUNT(*) FROM creatures WHERE rarity_tier = 'Epic'
UNION ALL
SELECT 'Legendary', COUNT(*) FROM creatures WHERE rarity_tier = 'Legendary';
