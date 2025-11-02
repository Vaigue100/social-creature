-- Remove unique constraint to allow more creature variety
-- We want many creatures, not just unique combinations

ALTER TABLE creatures DROP CONSTRAINT IF EXISTS creatures_subspecies_id_colouring_id_style_id_mood_id_motio_key;
ALTER TABLE creatures DROP CONSTRAINT IF EXISTS unique_creature_combination;

-- Add index for faster lookups instead
CREATE INDEX IF NOT EXISTS idx_creatures_combination ON creatures(
    subspecies_id, colouring_id, style_id, mood_id, motion_type_id,
    elemental_affinity_id, environment_id
);
