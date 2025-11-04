-- ==============================================================================
-- FIX DIMENSION DATA - Comprehensive Updates
-- ==============================================================================

-- ==============================================================================
-- 1. FIX SUBSPECIES - Add missing species_id
-- ==============================================================================

-- Assign species to orphaned subspecies
UPDATE dim_subspecies SET species_id = 17 WHERE subspecies_name = 'Robot'; -- Cyber
UPDATE dim_subspecies SET species_id = 17 WHERE subspecies_name = 'Cyborg'; -- Cyber
UPDATE dim_subspecies SET species_id = 19 WHERE subspecies_name = 'Sprite'; -- Fey
UPDATE dim_subspecies SET species_id = 13 WHERE subspecies_name = 'Golem'; -- Construct
UPDATE dim_subspecies SET species_id = 24 WHERE subspecies_name = 'Phantom'; -- Spirit
UPDATE dim_subspecies SET species_id = 13 WHERE subspecies_name = 'Automaton'; -- Construct
UPDATE dim_subspecies SET species_id = 19 WHERE subspecies_name = 'Wisp'; -- Fey
UPDATE dim_subspecies SET species_id = 13 WHERE subspecies_name = 'Construct'; -- Construct
UPDATE dim_subspecies SET species_id = 13 WHERE subspecies_name = 'Homunculus'; -- Construct
UPDATE dim_subspecies SET species_id = 12 WHERE subspecies_name = 'Elemental'; -- Elemental

-- ==============================================================================
-- 2. ADD SUBSPECIES DESCRIPTIONS (for prompt generation)
-- ==============================================================================

-- Add description column if it doesn't exist
ALTER TABLE dim_subspecies ADD COLUMN IF NOT EXISTS description TEXT;

-- Mammals
UPDATE dim_subspecies SET description = 'small furry creature with big eyes and fluffy tail' WHERE subspecies_name = 'Fox' AND species_id = 1;
UPDATE dim_subspecies SET description = 'tiny adorable creature with round body and soft fur' WHERE subspecies_name = 'Mouse' AND species_id = 1;
UPDATE dim_subspecies SET description = 'playful creature with bushy tail and bright eyes' WHERE subspecies_name = 'Squirrel' AND species_id = 1;
UPDATE dim_subspecies SET description = 'gentle creature with long ears and soft features' WHERE subspecies_name = 'Rabbit' AND species_id = 1;
UPDATE dim_subspecies SET description = 'cuddly bear-like creature with round features' WHERE subspecies_name = 'Bear Cub' AND species_id = 1;
UPDATE dim_subspecies SET description = 'small cat-like creature with whiskers and paws' WHERE subspecies_name = 'Kitten' AND species_id = 1;
UPDATE dim_subspecies SET description = 'energetic puppy-like creature with wagging tail' WHERE subspecies_name = 'Puppy' AND species_id = 1;
UPDATE dim_subspecies SET description = 'striped creature with playful demeanor' WHERE subspecies_name = 'Raccoon' AND species_id = 1;
UPDATE dim_subspecies SET description = 'nocturnal creature with large curious eyes' WHERE subspecies_name = 'Hedgehog' AND species_id = 1;
UPDATE dim_subspecies SET description = 'fluffy creature with long bushy tail' WHERE subspecies_name = 'Red Panda' AND species_id = 1;

-- Aquatic
UPDATE dim_subspecies SET description = 'streamlined aquatic creature with fins' WHERE subspecies_name = 'Fish' AND species_id = 3;
UPDATE dim_subspecies SET description = 'cute round aquatic creature with tentacles' WHERE subspecies_name = 'Octopus' AND species_id = 3;
UPDATE dim_subspecies SET description = 'playful marine creature with friendly smile' WHERE subspecies_name = 'Dolphin' AND species_id = 3;
UPDATE dim_subspecies SET description = 'graceful water creature with flowing fins' WHERE subspecies_name = 'Koi' AND species_id = 3;

-- ==============================================================================
-- 3. ADD NEW COLORINGS (multi-color, reduce gold)
-- ==============================================================================

-- Add vibrant 3-color combinations
INSERT INTO dim_colouring (colouring_name) VALUES
('Pink & purple & white'),
('Blue & teal & cyan'),
('Orange & yellow & cream'),
('Green & lime & yellow'),
('Red & orange & pink'),
('Purple & lavender & pink'),
('Mint & turquoise & white'),
('Peach & coral & cream'),
('Sky blue & white & silver'),
('Rose & pink & cream'),
('Sunset orange & pink & yellow'),
('Rainbow pastel'),
('Candy colors'),
('Ice cream colors'),
('Bubblegum pink & blue & white'),
('Lemon & mint & cream'),
('Berry & cream & pink'),
('Ocean blue & aqua & white'),
('Forest green & lime & brown'),
('Autumn red & orange & gold')
ON CONFLICT (colouring_name) DO NOTHING;

-- ==============================================================================
-- 4. ADD HUMAN ENVIRONMENTS
-- ==============================================================================

INSERT INTO dim_environment (environment_name) VALUES
('Cozy home'),
('Garden'),
('Living room'),
('Bedroom'),
('Kitchen'),
('Bookshelf'),
('Window sill'),
('Desk'),
('Cottage'),
('Cafe')
ON CONFLICT (environment_name) DO NOTHING;

-- ==============================================================================
-- 5. ADD CALM MOTION TYPES (reduce wing emphasis)
-- ==============================================================================

INSERT INTO dim_motion_type (motion_name) VALUES
('Gentle sway'),
('Slow walk'),
('Peaceful rest'),
('Soft breathing'),
('Calm sitting'),
('Lazy stretch'),
('Gentle nod'),
('Slow blink'),
('Peaceful sleep'),
('Soft wiggle'),
('Gentle bounce'),
('Slow turn'),
('Cozy curl'),
('Relaxed pose'),
('Calm float'),
('Gentle rock'),
('Soft sway'),
('Peaceful stand'),
('Quiet hover'),
('Still watch')
ON CONFLICT (motion_name) DO NOTHING;

-- ==============================================================================
-- 6. ADD CUTE-FOCUSED SPECIES
-- ==============================================================================

INSERT INTO dim_species (species_name, category) VALUES
('Plushie', 'Artificial'),
('Toy', 'Artificial'),
('Mascot', 'Artificial'),
('Companion', 'Friendly'),
('Pet', 'Friendly'),
('Stuffed Animal', 'Artificial'),
('Kawaii Creature', 'Cute'),
('Chibi Beast', 'Cute'),
('Pocket Pet', 'Friendly'),
('Mini Friend', 'Friendly')
ON CONFLICT (species_name) DO NOTHING;

-- Get IDs for new species
DO $$
DECLARE
    plushie_id INTEGER;
    toy_id INTEGER;
    mascot_id INTEGER;
    companion_id INTEGER;
    pet_id INTEGER;
BEGIN
    SELECT id INTO plushie_id FROM dim_species WHERE species_name = 'Plushie';
    SELECT id INTO toy_id FROM dim_species WHERE species_name = 'Toy';
    SELECT id INTO mascot_id FROM dim_species WHERE species_name = 'Mascot';
    SELECT id INTO companion_id FROM dim_species WHERE species_name = 'Companion';
    SELECT id INTO pet_id FROM dim_species WHERE species_name = 'Pet';

    -- Add subspecies for new species
    INSERT INTO dim_subspecies (subspecies_name, species_id, description) VALUES
    ('Teddy Bear', plushie_id, 'soft teddy bear with button eyes and huggable body'),
    ('Bunny Plush', plushie_id, 'fluffy bunny plushie with floppy ears'),
    ('Cat Plush', plushie_id, 'adorable cat plushie with round face'),
    ('Unicorn Toy', toy_id, 'magical toy unicorn with sparkly mane'),
    ('Dinosaur Toy', toy_id, 'cute toy dinosaur with rounded features'),
    ('Star Mascot', mascot_id, 'cheerful star-shaped mascot character'),
    ('Cloud Mascot', mascot_id, 'fluffy cloud mascot with happy face'),
    ('Heart Companion', companion_id, 'heart-shaped companion with loving expression'),
    ('Bubble Pet', pet_id, 'bubble-like pet that floats gently'),
    ('Gem Pet', pet_id, 'crystalline pet that sparkles softly')
    ON CONFLICT DO NOTHING;
END $$;

-- ==============================================================================
-- 7. ADD CUTE-FOCUSED STYLES
-- ==============================================================================

INSERT INTO dim_style (style_name) VALUES
('Super Kawaii'),
('Soft Plush'),
('Rounded Cartoon'),
('Baby Animal'),
('Toy Style'),
('Chibi Mini'),
('Pastel Soft'),
('Bubble Pop'),
('Candy Sweet'),
('Gentle Cute'),
('Cuddly Soft'),
('Playful Round'),
('Sweet Simple'),
('Adorable Chubby'),
('Fuzzy Warm')
ON CONFLICT (style_name) DO NOTHING;

-- ==============================================================================
-- SUMMARY
-- ==============================================================================

SELECT 'Dimension fixes complete!' as status;
SELECT COUNT(*) as subspecies_with_species FROM dim_subspecies WHERE species_id IS NOT NULL;
SELECT COUNT(*) as new_colorings FROM dim_colouring WHERE colouring_name LIKE '%&%&%' OR colouring_name LIKE 'Rainbow%' OR colouring_name LIKE 'Candy%';
SELECT COUNT(*) as human_environments FROM dim_environment WHERE environment_name IN ('Cozy home','Garden','Living room','Bedroom','Kitchen');
SELECT COUNT(*) as calm_motions FROM dim_motion_type WHERE motion_name LIKE 'Gentle%' OR motion_name LIKE 'Soft%' OR motion_name LIKE 'Calm%' OR motion_name LIKE 'Peaceful%';
SELECT COUNT(*) as cute_species FROM dim_species WHERE species_name IN ('Plushie','Toy','Mascot','Companion','Pet');
SELECT COUNT(*) as cute_styles FROM dim_style WHERE style_name LIKE '%Cute%' OR style_name LIKE '%Kawaii%' OR style_name LIKE '%Soft%';
