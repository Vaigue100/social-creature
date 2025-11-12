-- Migration 14: Update Body Type Display Names
-- Updates dim_body_type body_type_name column with shorter, friendlier names

UPDATE dim_body_type SET body_type_name = 'Noodles' WHERE body_type_name = 'Long & Noodle-like';
UPDATE dim_body_type SET body_type_name = 'Sleeks' WHERE body_type_name = 'Sleek & Smooth';
UPDATE dim_body_type SET body_type_name = 'Floofs' WHERE body_type_name = 'Floofy & Round';
UPDATE dim_body_type SET body_type_name = 'Beanies' WHERE body_type_name = 'Bean-shaped';
UPDATE dim_body_type SET body_type_name = 'Blobs' WHERE body_type_name = 'Blobby & Wiggly';
UPDATE dim_body_type SET body_type_name = 'Squishies' WHERE body_type_name = 'Chubby & Squishy';
UPDATE dim_body_type SET body_type_name = 'Athletes' WHERE body_type_name = 'Athletic';
UPDATE dim_body_type SET body_type_name = 'Spikes' WHERE body_type_name = 'Spiky but Soft';

-- Verify the updates
SELECT * FROM dim_body_type ORDER BY id;
