-- Migration 25: Create body type frame configuration table

-- Create the frame configuration table
CREATE TABLE IF NOT EXISTS body_type_frame_config (
    id SERIAL PRIMARY KEY,
    body_type_name VARCHAR(50) NOT NULL UNIQUE,
    image_width_percent INTEGER DEFAULT 100,
    image_max_width_px INTEGER DEFAULT 600,
    image_max_height_vh INTEGER DEFAULT 70,
    image_min_width_px INTEGER DEFAULT 250,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add comment
COMMENT ON TABLE body_type_frame_config IS 'Configuration for how creature images are sized within frames for each body type';
COMMENT ON COLUMN body_type_frame_config.image_width_percent IS 'Width as percentage (e.g., 90 for 90%)';
COMMENT ON COLUMN body_type_frame_config.image_max_width_px IS 'Maximum width in pixels';
COMMENT ON COLUMN body_type_frame_config.image_max_height_vh IS 'Maximum height in viewport height units';
COMMENT ON COLUMN body_type_frame_config.image_min_width_px IS 'Minimum width in pixels';

-- Insert configuration for Floof (the only one with custom sizing currently)
INSERT INTO body_type_frame_config (body_type_name, image_width_percent, image_max_width_px, image_max_height_vh, image_min_width_px)
VALUES ('Floof', 90, 542, 63, 225)
ON CONFLICT (body_type_name) DO UPDATE SET
    image_width_percent = EXCLUDED.image_width_percent,
    image_max_width_px = EXCLUDED.image_max_width_px,
    image_max_height_vh = EXCLUDED.image_max_height_vh,
    image_min_width_px = EXCLUDED.image_min_width_px,
    updated_at = CURRENT_TIMESTAMP;

-- Show the configuration
SELECT * FROM body_type_frame_config ORDER BY body_type_name;
