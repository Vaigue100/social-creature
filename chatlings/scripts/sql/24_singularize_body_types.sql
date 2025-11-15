-- Migration 24: Change body type names from plural to singular

-- Update plural body type names to singular
UPDATE dim_body_type SET body_type_name = 'Knight' WHERE body_type_name = 'Knights';
UPDATE dim_body_type SET body_type_name = 'Guardian' WHERE body_type_name = 'Guardians';
UPDATE dim_body_type SET body_type_name = 'Ranger' WHERE body_type_name = 'Rangers';
UPDATE dim_body_type SET body_type_name = 'Mage' WHERE body_type_name = 'Mages';
UPDATE dim_body_type SET body_type_name = 'Dragon' WHERE body_type_name = 'Dragons';
UPDATE dim_body_type SET body_type_name = 'Beast' WHERE body_type_name = 'Beasts';
UPDATE dim_body_type SET body_type_name = 'Mech' WHERE body_type_name = 'Mechs';
UPDATE dim_body_type SET body_type_name = 'Spirit' WHERE body_type_name = 'Spirits';
UPDATE dim_body_type SET body_type_name = 'Titan' WHERE body_type_name = 'Titans';
UPDATE dim_body_type SET body_type_name = 'Floof' WHERE body_type_name = 'Floofs';
UPDATE dim_body_type SET body_type_name = 'Beanie' WHERE body_type_name = 'Beanies';
UPDATE dim_body_type SET body_type_name = 'Blob' WHERE body_type_name = 'Blobs';
UPDATE dim_body_type SET body_type_name = 'Noodle' WHERE body_type_name = 'Noodles';
UPDATE dim_body_type SET body_type_name = 'Squishy' WHERE body_type_name = 'Squishies';
UPDATE dim_body_type SET body_type_name = 'Spike' WHERE body_type_name = 'Spikes';
UPDATE dim_body_type SET body_type_name = 'Sleek' WHERE body_type_name = 'Sleeks';
UPDATE dim_body_type SET body_type_name = 'Athlete' WHERE body_type_name = 'Athletes';

-- Verify the updates
SELECT id, body_type_name FROM dim_body_type ORDER BY id;
