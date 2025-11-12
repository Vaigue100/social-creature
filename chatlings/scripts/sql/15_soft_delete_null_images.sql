-- Migration 15: Soft delete creatures with null images
-- Sets is_active = false for creatures without valid images

\c chatlings;

-- Mark creatures with null or missing images as inactive (soft delete)
UPDATE creatures
SET is_active = false
WHERE selected_image IS NULL
   OR selected_image = 'null';

-- Show how many creatures were marked inactive
SELECT
    COUNT(*) as inactive_count,
    (SELECT COUNT(*) FROM creatures WHERE is_active = true) as active_count
FROM creatures
WHERE is_active = false;

-- Add index for better performance on is_active queries
CREATE INDEX IF NOT EXISTS idx_creatures_is_active ON creatures(is_active);
