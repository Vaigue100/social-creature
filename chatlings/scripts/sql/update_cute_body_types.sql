-- Add "cute" and "adorable" back to specific body types

UPDATE dim_body_type SET prompt_text = 'cute adorable fluffy round creature, ultra soft puffy body' WHERE id = 1; -- Floofy & Round
UPDATE dim_body_type SET prompt_text = 'cute adorable bean-shaped creature, tiny compact body' WHERE id = 2; -- Bean-shaped
UPDATE dim_body_type SET prompt_text = 'cute adorable blobby wiggly creature, soft bouncy body' WHERE id = 3; -- Blobby & Wiggly
UPDATE dim_body_type SET prompt_text = 'cute adorable chubby squishy creature, soft round body' WHERE id = 5; -- Chubby & Squishy
UPDATE dim_body_type SET prompt_text = 'cute adorable spiky but soft creature, gentle textured body' WHERE id = 6; -- Spiky but Soft
