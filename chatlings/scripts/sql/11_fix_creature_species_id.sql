-- ==============================================================================
-- FIX CREATURE SPECIES_ID - Sync from subspecies
-- ==============================================================================

-- Update all creatures to have correct species_id based on their subspecies
UPDATE creatures c
SET species_id = ss.species_id
FROM dim_subspecies ss
WHERE c.subspecies_id = ss.id
AND ss.species_id IS NOT NULL;

-- Show results
SELECT
  s.species_name,
  COUNT(c.id) as creature_count
FROM creatures c
JOIN dim_species s ON c.species_id = s.id
GROUP BY s.id, s.species_name
ORDER BY creature_count DESC;
