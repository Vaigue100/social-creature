-- Restructure body types and dimensions for better trait relationships
-- This creates a hierarchical structure where body type influences available traits

-- ============================================================================
-- STEP 1: Update existing body types (remove "cute")
-- ============================================================================

UPDATE dim_body_type SET prompt_text = 'fluffy round creature, ultra soft puffy body' WHERE body_type_name = 'Floofy & Round';
UPDATE dim_body_type SET prompt_text = 'bean-shaped creature, tiny compact body' WHERE body_type_name = 'Bean-shaped';
UPDATE dim_body_type SET prompt_text = 'blobby wiggly creature, soft bouncy body' WHERE body_type_name = 'Blobby & Wiggly';
UPDATE dim_body_type SET prompt_text = 'long noodle-like creature, sleek smooth elongated body' WHERE body_type_name = 'Long & Noodle-like';
UPDATE dim_body_type SET prompt_text = 'chubby squishy creature, soft round body' WHERE body_type_name = 'Chubby & Squishy';
UPDATE dim_body_type SET prompt_text = 'spiky but soft creature, gentle textured body' WHERE body_type_name = 'Spiky but Soft';
UPDATE dim_body_type SET prompt_text = 'athletic creature, fit toned body, energetic build' WHERE body_type_name = 'Athletic';
UPDATE dim_body_type SET prompt_text = 'sleek smooth creature, streamlined body' WHERE body_type_name = 'Sleek & Smooth';

-- ============================================================================
-- STEP 2: Add new body types (Robot, Zombie, Gothic)
-- ============================================================================

INSERT INTO dim_body_type (body_type_name, prompt_text) VALUES
('Robot', 'chibi robot, mechanical parts, shiny metal body, glowing eyes, circuits visible, tech aesthetic'),
('Zombie', 'chibi zombie, undead, tattered clothes, stitches, slightly decomposed, pastel zombie colors'),
('Gothic', 'chibi gothic, dark aesthetic, victorian gothic elements, lace details, dark makeup, elegant dark clothing, mysterious vibe');

-- ============================================================================
-- STEP 3: Add body_type_id to dimension tables
-- ============================================================================

ALTER TABLE dim_color_scheme ADD COLUMN IF NOT EXISTS body_type_id INTEGER REFERENCES dim_body_type(id);
ALTER TABLE dim_social_activity ADD COLUMN IF NOT EXISTS body_type_id INTEGER REFERENCES dim_body_type(id);
ALTER TABLE dim_social_mood ADD COLUMN IF NOT EXISTS body_type_id INTEGER REFERENCES dim_body_type(id);
ALTER TABLE dim_special_quirk ADD COLUMN IF NOT EXISTS body_type_id INTEGER REFERENCES dim_body_type(id);

-- Set existing traits to NULL (applies to all cute body types)
UPDATE dim_color_scheme SET body_type_id = NULL;
UPDATE dim_social_activity SET body_type_id = NULL;
UPDATE dim_social_mood SET body_type_id = NULL;
UPDATE dim_special_quirk SET body_type_id = NULL;

-- ============================================================================
-- STEP 4: Add Robot-specific traits
-- ============================================================================

-- Robot colors
INSERT INTO dim_color_scheme (scheme_name, prompt_text, body_type_id) VALUES
('Metallic Silver', 'shiny metallic silver color scheme', (SELECT id FROM dim_body_type WHERE body_type_name = 'Robot')),
('Chrome Blue', 'chrome blue metallic finish', (SELECT id FROM dim_body_type WHERE body_type_name = 'Robot')),
('Neon Tech', 'bright neon accents, glowing tech colors', (SELECT id FROM dim_body_type WHERE body_type_name = 'Robot')),
('Dark Gunmetal', 'dark gunmetal gray with glowing details', (SELECT id FROM dim_body_type WHERE body_type_name = 'Robot'));

-- Robot activities
INSERT INTO dim_social_activity (activity_name, prompt_text, body_type_id) VALUES
('Computing', 'processing data, digital displays visible', (SELECT id FROM dim_body_type WHERE body_type_name = 'Robot')),
('Scanning', 'scanning environment with tech sensors', (SELECT id FROM dim_body_type WHERE body_type_name = 'Robot')),
('Recharging', 'connected to power source, recharging', (SELECT id FROM dim_body_type WHERE body_type_name = 'Robot')),
('Hovering', 'hovering slightly off ground with anti-grav', (SELECT id FROM dim_body_type WHERE body_type_name = 'Robot'));

-- Robot moods
INSERT INTO dim_social_mood (mood_name, prompt_text, body_type_id) VALUES
('Analytical', 'analytical expression, calculating', (SELECT id FROM dim_body_type WHERE body_type_name = 'Robot')),
('Processing', 'loading icon visible, processing', (SELECT id FROM dim_body_type WHERE body_type_name = 'Robot')),
('Alert', 'alert status, sensors active', (SELECT id FROM dim_body_type WHERE body_type_name = 'Robot')),
('Low Battery', 'tired expression, low power indicator', (SELECT id FROM dim_body_type WHERE body_type_name = 'Robot'));

-- Robot quirks
INSERT INTO dim_special_quirk (quirk_name, prompt_text, body_type_id) VALUES
('Antenna Array', 'small antenna protruding from head', (SELECT id FROM dim_body_type WHERE body_type_name = 'Robot')),
('Circuit Display', 'visible circuitry patterns on body', (SELECT id FROM dim_body_type WHERE body_type_name = 'Robot')),
('LED Panel', 'LED display panel showing status', (SELECT id FROM dim_body_type WHERE body_type_name = 'Robot')),
('Mechanical Joints', 'visible mechanical joints and hinges', (SELECT id FROM dim_body_type WHERE body_type_name = 'Robot'));

-- ============================================================================
-- STEP 5: Add Zombie-specific traits
-- ============================================================================

-- Zombie colors
INSERT INTO dim_color_scheme (scheme_name, prompt_text, body_type_id) VALUES
('Decay Green', 'pale sickly green tones', (SELECT id FROM dim_body_type WHERE body_type_name = 'Zombie')),
('Undead Gray', 'ashen gray pallor', (SELECT id FROM dim_body_type WHERE body_type_name = 'Zombie')),
('Pastel Zombie', 'pastel purple and green decay colors', (SELECT id FROM dim_body_type WHERE body_type_name = 'Zombie')),
('Stitched Patchwork', 'patchwork of different skin tones, stitches visible', (SELECT id FROM dim_body_type WHERE body_type_name = 'Zombie'));

-- Zombie activities
INSERT INTO dim_social_activity (activity_name, prompt_text, body_type_id) VALUES
('Shambling', 'shambling forward slowly', (SELECT id FROM dim_body_type WHERE body_type_name = 'Zombie')),
('Groaning', 'mouth open in typical zombie groan', (SELECT id FROM dim_body_type WHERE body_type_name = 'Zombie')),
('Searching', 'looking around confusedly', (SELECT id FROM dim_body_type WHERE body_type_name = 'Zombie')),
('Lurching', 'lurching to the side awkwardly', (SELECT id FROM dim_body_type WHERE body_type_name = 'Zombie'));

-- Zombie moods
INSERT INTO dim_social_mood (mood_name, prompt_text, body_type_id) VALUES
('Hungry', 'hungry undead expression', (SELECT id FROM dim_body_type WHERE body_type_name = 'Zombie')),
('Confused', 'confused undead look', (SELECT id FROM dim_body_type WHERE body_type_name = 'Zombie')),
('Tired', 'exhausted undead appearance', (SELECT id FROM dim_body_type WHERE body_type_name = 'Zombie')),
('Friendly Zombie', 'surprisingly friendly zombie demeanor', (SELECT id FROM dim_body_type WHERE body_type_name = 'Zombie'));

-- Zombie quirks
INSERT INTO dim_special_quirk (quirk_name, prompt_text, body_type_id) VALUES
('Visible Stitches', 'prominent stitches across body', (SELECT id FROM dim_body_type WHERE body_type_name = 'Zombie')),
('Missing Bits', 'small missing pieces patched up', (SELECT id FROM dim_body_type WHERE body_type_name = 'Zombie')),
('Tattered Outfit', 'wearing tattered decaying clothes', (SELECT id FROM dim_body_type WHERE body_type_name = 'Zombie')),
('Bone Showing', 'small bone visible through skin', (SELECT id FROM dim_body_type WHERE body_type_name = 'Zombie'));

-- ============================================================================
-- STEP 6: Add Gothic-specific traits
-- ============================================================================

-- Gothic colors
INSERT INTO dim_color_scheme (scheme_name, prompt_text, body_type_id) VALUES
('Midnight Black', 'deep black with subtle highlights', (SELECT id FROM dim_body_type WHERE body_type_name = 'Gothic')),
('Deep Purple', 'rich deep purple tones', (SELECT id FROM dim_body_type WHERE body_type_name = 'Gothic')),
('Crimson Red', 'dark crimson red accents', (SELECT id FROM dim_body_type WHERE body_type_name = 'Gothic')),
('Victorian Plum', 'dark plum and black combination', (SELECT id FROM dim_body_type WHERE body_type_name = 'Gothic'));

-- Gothic activities
INSERT INTO dim_social_activity (activity_name, prompt_text, body_type_id) VALUES
('Reading Poetry', 'reading from old leather-bound book', (SELECT id FROM dim_body_type WHERE body_type_name = 'Gothic')),
('Gazing Mysteriously', 'gazing dramatically into distance', (SELECT id FROM dim_body_type WHERE body_type_name = 'Gothic')),
('Writing', 'writing with ornate quill pen', (SELECT id FROM dim_body_type WHERE body_type_name = 'Gothic')),
('Brooding', 'brooding in contemplative pose', (SELECT id FROM dim_body_type WHERE body_type_name = 'Gothic'));

-- Gothic moods
INSERT INTO dim_social_mood (mood_name, prompt_text, body_type_id) VALUES
('Melancholic', 'melancholic wistful expression', (SELECT id FROM dim_body_type WHERE body_type_name = 'Gothic')),
('Mysterious', 'mysterious enigmatic aura', (SELECT id FROM dim_body_type WHERE body_type_name = 'Gothic')),
('Elegant', 'elegant refined demeanor', (SELECT id FROM dim_body_type WHERE body_type_name = 'Gothic')),
('Dramatic', 'dramatic theatrical expression', (SELECT id FROM dim_body_type WHERE body_type_name = 'Gothic'));

-- Gothic quirks
INSERT INTO dim_special_quirk (quirk_name, prompt_text, body_type_id) VALUES
('Lace Collar', 'ornate lace collar detail', (SELECT id FROM dim_body_type WHERE body_type_name = 'Gothic')),
('Victorian Brooch', 'antique victorian brooch accessory', (SELECT id FROM dim_body_type WHERE body_type_name = 'Gothic')),
('Dark Makeup', 'elegant gothic makeup', (SELECT id FROM dim_body_type WHERE body_type_name = 'Gothic')),
('Parasol', 'carrying small ornate parasol', (SELECT id FROM dim_body_type WHERE body_type_name = 'Gothic'));

-- ============================================================================
-- STEP 7: Drop old aesthetic table (wrong approach)
-- ============================================================================

DROP TABLE IF EXISTS dim_aesthetic CASCADE;

-- Remove aesthetic_id from creatures if it exists
ALTER TABLE creatures DROP COLUMN IF EXISTS aesthetic_id;

-- ============================================================================
-- Add indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_color_scheme_body_type ON dim_color_scheme(body_type_id);
CREATE INDEX IF NOT EXISTS idx_social_activity_body_type ON dim_social_activity(body_type_id);
CREATE INDEX IF NOT EXISTS idx_social_mood_body_type ON dim_social_mood(body_type_id);
CREATE INDEX IF NOT EXISTS idx_special_quirk_body_type ON dim_special_quirk(body_type_id);

-- ============================================================================
-- Add comments
-- ============================================================================

COMMENT ON COLUMN dim_color_scheme.body_type_id IS 'NULL means applies to all cute body types; specific ID means exclusive to that body type';
COMMENT ON COLUMN dim_social_activity.body_type_id IS 'NULL means applies to all cute body types; specific ID means exclusive to that body type';
COMMENT ON COLUMN dim_social_mood.body_type_id IS 'NULL means applies to all cute body types; specific ID means exclusive to that body type';
COMMENT ON COLUMN dim_special_quirk.body_type_id IS 'NULL means applies to all cute body types; specific ID means exclusive to that body type';
