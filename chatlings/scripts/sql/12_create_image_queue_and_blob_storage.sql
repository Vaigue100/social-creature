-- Migration 12: Create image selection queue and blob storage
-- This migration adds:
-- 1. image_selection_queue table to track images awaiting selection
-- 2. selected_image_data column to store the chosen image as blob
-- 3. Removes selected_image filename column (replaced by blob)

-- Create image selection queue table
CREATE TABLE IF NOT EXISTS image_selection_queue (
  id SERIAL PRIMARY KEY,
  creature_id TEXT NOT NULL,
  image_1_path TEXT,
  image_2_path TEXT,
  image_3_path TEXT,
  image_4_path TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(creature_id)
);

CREATE INDEX IF NOT EXISTS idx_queue_creature ON image_selection_queue(creature_id);

-- Add blob storage column to creatures table
ALTER TABLE creatures ADD COLUMN IF NOT EXISTS selected_image_data BYTEA;

-- Note: We'll keep selected_image column for now as backup, can remove later
-- ALTER TABLE creatures DROP COLUMN IF EXISTS selected_image;

-- Comments
COMMENT ON TABLE image_selection_queue IS 'Queue of creatures with generated images awaiting selection';
COMMENT ON COLUMN creatures.selected_image_data IS 'Selected image stored as binary blob (JPEG format)';
