-- ============================================================================
-- Migration 45: Hierarchical Team System with Affinity Bonuses
-- ============================================================================
-- Creates new team structure with parent-child relationships
-- Replaces flat team_member_X columns with hierarchical positions
-- ============================================================================

-- ============================================================================
-- STEP 1: Create team positions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS team_positions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    creature_id UUID NOT NULL REFERENCES creatures(id) ON DELETE CASCADE,

    -- Position metadata
    position_type VARCHAR(50) NOT NULL, -- 'architect', 'prime', 'analyst', 'engineer', 'clerk', 'assistant'
    level INTEGER NOT NULL CHECK (level >= 1 AND level <= 4),

    -- Hierarchy
    parent_position_id INTEGER REFERENCES team_positions(id) ON DELETE CASCADE,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    UNIQUE(user_id, position_type), -- Each user can only have one chatling per position type
    UNIQUE(user_id, creature_id)    -- Each creature can only hold one position per user
);

-- ============================================================================
-- STEP 2: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_team_positions_user ON team_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_team_positions_creature ON team_positions(creature_id);
CREATE INDEX IF NOT EXISTS idx_team_positions_parent ON team_positions(parent_position_id);
CREATE INDEX IF NOT EXISTS idx_team_positions_level ON team_positions(level);
CREATE INDEX IF NOT EXISTS idx_team_positions_type ON team_positions(position_type);

-- ============================================================================
-- STEP 3: Create team scores cache table (for performance)
-- ============================================================================

CREATE TABLE IF NOT EXISTS team_scores_cache (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

    -- Cached scores
    total_score NUMERIC(10, 2) NOT NULL DEFAULT 0,
    base_score NUMERIC(10, 2) NOT NULL DEFAULT 0,
    synergy_bonus NUMERIC(10, 2) NOT NULL DEFAULT 0,
    affinity_bonus NUMERIC(10, 2) NOT NULL DEFAULT 0,
    tier_completion_bonus NUMERIC(10, 2) NOT NULL DEFAULT 0,

    -- Team composition stats
    num_positions_filled INTEGER NOT NULL DEFAULT 0,
    num_unique_body_types INTEGER NOT NULL DEFAULT 0,
    total_affinity_connections INTEGER NOT NULL DEFAULT 0,

    -- Score breakdown by level
    level_1_contribution NUMERIC(10, 2) DEFAULT 0,
    level_2_contribution NUMERIC(10, 2) DEFAULT 0,
    level_3_contribution NUMERIC(10, 2) DEFAULT 0,
    level_4_contribution NUMERIC(10, 2) DEFAULT 0,

    -- Timestamps
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_team_scores_user ON team_scores_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_team_scores_total ON team_scores_cache(total_score DESC);

-- ============================================================================
-- STEP 4: Add position type constraints
-- ============================================================================

-- Valid position types by level
CREATE OR REPLACE FUNCTION validate_position_type() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.level = 1 AND NEW.position_type != 'architect' THEN
        RAISE EXCEPTION 'Level 1 must be architect';
    END IF;

    IF NEW.level = 2 AND NEW.position_type != 'prime' THEN
        RAISE EXCEPTION 'Level 2 must be prime chatling';
    END IF;

    IF NEW.level = 3 AND NEW.position_type NOT IN ('analyst', 'engineer', 'clerk') THEN
        RAISE EXCEPTION 'Level 3 must be analyst, engineer, or clerk';
    END IF;

    IF NEW.level = 4 AND NEW.position_type != 'assistant' THEN
        RAISE EXCEPTION 'Level 4 must be assistant';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_position_type
    BEFORE INSERT OR UPDATE ON team_positions
    FOR EACH ROW
    EXECUTE FUNCTION validate_position_type();

-- ============================================================================
-- STEP 5: Add parent-child relationship constraints
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_team_hierarchy() RETURNS TRIGGER AS $$
DECLARE
    parent_level INTEGER;
    parent_user UUID;
BEGIN
    -- Level 1 (Architect) cannot have a parent
    IF NEW.level = 1 AND NEW.parent_position_id IS NOT NULL THEN
        RAISE EXCEPTION 'Architect (level 1) cannot have a parent';
    END IF;

    -- Levels 2-4 must have a parent
    IF NEW.level > 1 AND NEW.parent_position_id IS NULL THEN
        RAISE EXCEPTION 'Levels 2-4 must have a parent position';
    END IF;

    -- If has parent, validate parent is exactly one level up
    IF NEW.parent_position_id IS NOT NULL THEN
        SELECT level, user_id INTO parent_level, parent_user
        FROM team_positions
        WHERE id = NEW.parent_position_id;

        IF parent_level != NEW.level - 1 THEN
            RAISE EXCEPTION 'Parent must be exactly one level above child';
        END IF;

        IF parent_user != NEW.user_id THEN
            RAISE EXCEPTION 'Parent and child must belong to same user';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_team_hierarchy
    BEFORE INSERT OR UPDATE ON team_positions
    FOR EACH ROW
    EXECUTE FUNCTION validate_team_hierarchy();

-- ============================================================================
-- STEP 6: Limit number of positions at each level
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_position_count() RETURNS TRIGGER AS $$
DECLARE
    position_count INTEGER;
BEGIN
    -- Count existing positions at this level for this user
    SELECT COUNT(*) INTO position_count
    FROM team_positions
    WHERE user_id = NEW.user_id
      AND level = NEW.level
      AND id != COALESCE(NEW.id, -1); -- Exclude self for updates

    -- Level 1 & 2: max 1 position
    IF NEW.level IN (1, 2) AND position_count >= 1 THEN
        RAISE EXCEPTION 'Can only have 1 position at level %', NEW.level;
    END IF;

    -- Level 3: max 3 positions (analyst, engineer, clerk)
    IF NEW.level = 3 AND position_count >= 3 THEN
        RAISE EXCEPTION 'Can only have 3 positions at level 3';
    END IF;

    -- Level 4: max 3 positions (one per level 3 parent)
    IF NEW.level = 4 AND position_count >= 3 THEN
        RAISE EXCEPTION 'Can only have 3 assistants at level 4';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_position_count
    BEFORE INSERT ON team_positions
    FOR EACH ROW
    EXECUTE FUNCTION validate_position_count();

-- ============================================================================
-- STEP 7: Add comments
-- ============================================================================

COMMENT ON TABLE team_positions IS 'Hierarchical team structure with parent-child relationships';
COMMENT ON COLUMN team_positions.position_type IS 'Role: architect, prime, analyst, engineer, clerk, assistant';
COMMENT ON COLUMN team_positions.level IS 'Hierarchy level: 1 (top) to 4 (bottom)';
COMMENT ON COLUMN team_positions.parent_position_id IS 'Reference to parent position in hierarchy';

COMMENT ON TABLE team_scores_cache IS 'Cached team scores for performance - recalculated when team changes';
COMMENT ON COLUMN team_scores_cache.synergy_bonus IS 'Bonus from having multiple team members';
COMMENT ON COLUMN team_scores_cache.affinity_bonus IS 'Bonus from body type matching (horizontal)';
COMMENT ON COLUMN team_scores_cache.total_affinity_connections IS 'Number of same-body-type connections in team';
