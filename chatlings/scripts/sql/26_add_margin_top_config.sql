-- Migration 26: Add margin_top configuration for vertical positioning

-- Add margin_top column to frame config table
ALTER TABLE body_type_frame_config
ADD COLUMN IF NOT EXISTS image_margin_top_px INTEGER DEFAULT 0;

-- Add comment
COMMENT ON COLUMN body_type_frame_config.image_margin_top_px IS 'Top margin in pixels to position image vertically within frame';

-- Show updated table structure
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'body_type_frame_config'
ORDER BY ordinal_position;

-- Show all configurations
SELECT * FROM body_type_frame_config ORDER BY body_type_name;
