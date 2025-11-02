-- Update artwork table to handle 9 images per creature instead of 4

\c chatlings;

-- Drop the old constraint and add new one for 9 images
ALTER TABLE creature_artwork
DROP CONSTRAINT IF EXISTS creature_artwork_image_number_check;

ALTER TABLE creature_artwork
ADD CONSTRAINT creature_artwork_image_number_check
CHECK (image_number BETWEEN 1 AND 9);

COMMENT ON TABLE creature_artwork IS 'Tracks generated artwork for creatures (9 images per creature)';
