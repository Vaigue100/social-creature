-- Migration 16: Add perchance_image_id column to track unique images
-- This prevents the same image from being imported multiple times

\c chatlings;

-- Add column to store the unique Perchance image ID
ALTER TABLE creatures
ADD COLUMN IF NOT EXISTS perchance_image_id VARCHAR(255) UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_creatures_perchance_image_id ON creatures(perchance_image_id);

-- Show status
SELECT
    COUNT(*) as total_creatures,
    COUNT(perchance_image_id) as with_image_id
FROM creatures;
