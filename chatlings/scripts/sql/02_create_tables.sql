-- Chatlings Database Tables
-- Run this after database creation

\c chatlings;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- DIMENSION TABLES
-- These store the individual dimension values used to generate creatures
-- ============================================================================

-- Species dimension
CREATE TABLE IF NOT EXISTS dim_species (
    id SERIAL PRIMARY KEY,
    species_name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL, -- Real, Mythical, Cartoon, Synthetic, Nature Spirit, Cosmic, Abstract, Elemental Mood
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sub-species dimension
CREATE TABLE IF NOT EXISTS dim_subspecies (
    id SERIAL PRIMARY KEY,
    subspecies_name VARCHAR(100) UNIQUE NOT NULL,
    species_id INTEGER REFERENCES dim_species(id),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Colouring dimension
CREATE TABLE IF NOT EXISTS dim_colouring (
    id SERIAL PRIMARY KEY,
    colouring_name VARCHAR(100) UNIQUE NOT NULL,
    hex_primary VARCHAR(7),
    hex_secondary VARCHAR(7),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Style dimension
CREATE TABLE IF NOT EXISTS dim_style (
    id SERIAL PRIMARY KEY,
    style_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mood dimension
CREATE TABLE IF NOT EXISTS dim_mood (
    id SERIAL PRIMARY KEY,
    mood_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Motion Type dimension
CREATE TABLE IF NOT EXISTS dim_motion_type (
    id SERIAL PRIMARY KEY,
    motion_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    animation_template VARCHAR(255), -- Reference to animation template
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Elemental Affinity dimension
CREATE TABLE IF NOT EXISTS dim_elemental_affinity (
    id SERIAL PRIMARY KEY,
    affinity_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    particle_effect VARCHAR(255), -- Reference to particle effect
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Environment dimension
CREATE TABLE IF NOT EXISTS dim_environment (
    id SERIAL PRIMARY KEY,
    environment_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    background_template VARCHAR(255), -- Reference to background template
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- LORE TABLES
-- Hierarchical lore system: Game > Species > Subspecies > Character
-- ============================================================================

-- Game-level lore (overall world building)
CREATE TABLE IF NOT EXISTS lore_game (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    lore_type VARCHAR(50) NOT NULL, -- 'origin', 'mechanics', 'world', 'history'
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Species-level lore
CREATE TABLE IF NOT EXISTS lore_species (
    id SERIAL PRIMARY KEY,
    species_id INTEGER REFERENCES dim_species(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subspecies-level lore
CREATE TABLE IF NOT EXISTS lore_subspecies (
    id SERIAL PRIMARY KEY,
    subspecies_id INTEGER REFERENCES dim_subspecies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- CREATURES TABLE
-- Main table combining all dimensions to create unique creatures
-- Only stores character-specific lore to avoid duplication
-- ============================================================================

CREATE TABLE IF NOT EXISTS creatures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creature_name VARCHAR(255) UNIQUE NOT NULL,

    -- Foreign keys to dimensions
    species_id INTEGER REFERENCES dim_species(id),
    subspecies_id INTEGER REFERENCES dim_subspecies(id),
    colouring_id INTEGER REFERENCES dim_colouring(id),
    style_id INTEGER REFERENCES dim_style(id),
    mood_id INTEGER REFERENCES dim_mood(id),
    motion_type_id INTEGER REFERENCES dim_motion_type(id),
    elemental_affinity_id INTEGER REFERENCES dim_elemental_affinity(id),
    environment_id INTEGER REFERENCES dim_environment(id),

    -- Character-specific lore (only unique lore for this combination)
    character_lore TEXT,

    -- Rarity (calculated or assigned)
    rarity_tier VARCHAR(50), -- Common, Uncommon, Rare, Epic, Legendary
    rarity_score DECIMAL(5,2), -- Numeric score for rarity

    -- Animation reference
    animation_url VARCHAR(500),
    animation_format VARCHAR(20), -- MP4, WebP, Lottie
    thumbnail_url VARCHAR(500),

    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Unique constraint on combination
    UNIQUE(subspecies_id, colouring_id, style_id, mood_id, motion_type_id, elemental_affinity_id, environment_id)
);

-- ============================================================================
-- USER COLLECTION TABLES
-- Track which users have encountered which creatures
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    current_creature_id UUID REFERENCES creatures(id), -- The creature they currently are
    creature_rotation_interval INTEGER DEFAULT 86400, -- Seconds (24 hours default)
    last_creature_change TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_encounters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    creature_id UUID REFERENCES creatures(id) ON DELETE CASCADE,
    encountered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    encounter_count INTEGER DEFAULT 1,
    platform VARCHAR(50), -- YouTube, Reddit, Twitter, etc.
    post_url TEXT,

    UNIQUE(user_id, creature_id)
);

-- ============================================================================
-- INDEXES for performance
-- ============================================================================

CREATE INDEX idx_creatures_species ON creatures(species_id);
CREATE INDEX idx_creatures_subspecies ON creatures(subspecies_id);
CREATE INDEX idx_creatures_rarity ON creatures(rarity_tier);
CREATE INDEX idx_creatures_active ON creatures(is_active);
CREATE INDEX idx_user_encounters_user ON user_encounters(user_id);
CREATE INDEX idx_user_encounters_creature ON user_encounters(creature_id);
CREATE INDEX idx_user_encounters_platform ON user_encounters(platform);
CREATE INDEX idx_users_current_creature ON users(current_creature_id);

-- ============================================================================
-- TRIGGERS for updated_at timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_creatures_updated_at BEFORE UPDATE ON creatures
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lore_game_updated_at BEFORE UPDATE ON lore_game
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lore_species_updated_at BEFORE UPDATE ON lore_species
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lore_subspecies_updated_at BEFORE UPDATE ON lore_subspecies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE creatures IS 'Main creatures table with all dimension combinations';
COMMENT ON TABLE dim_species IS 'Species dimension values';
COMMENT ON TABLE dim_subspecies IS 'Sub-species dimension values';
COMMENT ON TABLE lore_game IS 'Game-level lore and world building';
COMMENT ON TABLE lore_species IS 'Species-specific lore';
COMMENT ON TABLE lore_subspecies IS 'Subspecies-specific lore';
COMMENT ON TABLE user_encounters IS 'Track which users have encountered which creatures';
