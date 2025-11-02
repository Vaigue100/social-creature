-- Create table for tracking generated artwork

\c chatlings;

CREATE TABLE IF NOT EXISTS creature_artwork (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creature_id UUID REFERENCES creatures(id) ON DELETE CASCADE,
    image_filename VARCHAR(255) NOT NULL,
    image_number INTEGER NOT NULL CHECK (image_number BETWEEN 1 AND 4),
    file_path VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT,
    generation_prompt TEXT,
    negative_prompt TEXT,
    art_style VARCHAR(100) DEFAULT 'Cute Figurine',
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(creature_id, image_number)
);

CREATE INDEX IF NOT EXISTS idx_creature_artwork_creature
ON creature_artwork(creature_id);

CREATE INDEX IF NOT EXISTS idx_creature_artwork_generated
ON creature_artwork(generated_at);

-- View to see creatures with artwork
CREATE OR REPLACE VIEW creatures_with_artwork AS
SELECT
    c.id,
    c.creature_name,
    c.creature_shortname,
    c.rarity_tier,
    COUNT(ca.id) as artwork_count,
    MAX(ca.generated_at) as last_generated
FROM creatures c
LEFT JOIN creature_artwork ca ON c.id = ca.creature_id
GROUP BY c.id, c.creature_name, c.creature_shortname, c.rarity_tier;

-- View to see creatures without artwork (for random selection)
CREATE OR REPLACE VIEW creatures_without_artwork AS
SELECT
    c.id,
    c.creature_name,
    c.creature_shortname,
    c.rarity_tier,
    ds.species_name,
    dss.subspecies_name
FROM creatures c
JOIN dim_species ds ON c.species_id = ds.id
JOIN dim_subspecies dss ON c.subspecies_id = dss.id
LEFT JOIN creature_artwork ca ON c.id = ca.creature_id
WHERE ca.id IS NULL;

COMMENT ON TABLE creature_artwork IS 'Tracks generated artwork for creatures';
COMMENT ON VIEW creatures_with_artwork IS 'Shows all creatures with their artwork count';
COMMENT ON VIEW creatures_without_artwork IS 'Shows creatures that need artwork generated';
