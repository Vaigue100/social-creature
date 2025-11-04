-- Add column to store the selected primary image for each creature
ALTER TABLE creatures
ADD COLUMN IF NOT EXISTS selected_image VARCHAR(255);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_creatures_selected_image
ON creatures(selected_image);

-- Add comment
COMMENT ON COLUMN creatures.selected_image IS 'Filename of the primary image selected from the 4 generated options';
