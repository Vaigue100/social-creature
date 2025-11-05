-- Migration 13: Social Media Chatlings Dimensions
-- Complete replacement of old fantasy dimensions with social media themed dimensions

-- Drop old dimension tables (keeping creatures table for now)
DROP TABLE IF EXISTS dim_species CASCADE;
DROP TABLE IF EXISTS dim_subspecies CASCADE;
DROP TABLE IF EXISTS dim_colouring CASCADE;
DROP TABLE IF EXISTS dim_style CASCADE;
DROP TABLE IF EXISTS dim_mood CASCADE;
DROP TABLE IF EXISTS dim_motion_type CASCADE;
DROP TABLE IF EXISTS dim_elemental_affinity CASCADE;
DROP TABLE IF EXISTS dim_environment CASCADE;

-- New dimension: Body Type (replacing species/subspecies)
CREATE TABLE dim_body_type (
  id SERIAL PRIMARY KEY,
  body_type_name VARCHAR(100) NOT NULL UNIQUE,
  prompt_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- New dimension: Social Activity (replacing motion)
CREATE TABLE dim_social_activity (
  id SERIAL PRIMARY KEY,
  activity_name VARCHAR(100) NOT NULL UNIQUE,
  prompt_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- New dimension: Social Mood (refined)
CREATE TABLE dim_social_mood (
  id SERIAL PRIMARY KEY,
  mood_name VARCHAR(100) NOT NULL UNIQUE,
  prompt_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- New dimension: Color Scheme (simplified from colouring)
CREATE TABLE dim_color_scheme (
  id SERIAL PRIMARY KEY,
  scheme_name VARCHAR(100) NOT NULL UNIQUE,
  prompt_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- New dimension: Special Quirk (replacing elemental affinity)
CREATE TABLE dim_special_quirk (
  id SERIAL PRIMARY KEY,
  quirk_name VARCHAR(100) NOT NULL UNIQUE,
  prompt_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- New dimension: Size Category (replacing environment)
CREATE TABLE dim_size_category (
  id SERIAL PRIMARY KEY,
  size_name VARCHAR(100) NOT NULL UNIQUE,
  prompt_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert Body Types
INSERT INTO dim_body_type (body_type_name, prompt_text) VALUES
('Floofy & Round', 'cute fluffy round creature, ultra soft puffy body'),
('Bean-shaped', 'cute bean-shaped creature, tiny compact body'),
('Blobby & Wiggly', 'cute blobby wiggly creature, soft bouncy body'),
('Long & Noodle-like', 'cute long noodle-like creature, sleek smooth elongated body'),
('Chubby & Squishy', 'cute chubby squishy creature, soft round body'),
('Spiky but Soft', 'cute spiky but soft creature, gentle textured body'),
('Athletic', 'cute athletic creature, fit toned body, energetic build'),
('Sleek & Smooth', 'cute sleek smooth creature, streamlined body');

-- Insert Social Activities
INSERT INTO dim_social_activity (activity_name, prompt_text) VALUES
-- Original activities
('Sipping coffee', 'sitting relaxed holding tiny coffee cup'),
('Munching snacks', 'munching on tiny snack excitedly'),
('Scrolling phone', 'scrolling on tiny phone'),
('Dancing to music', 'dancing energetically with tiny headphones, music notes floating'),
('Typing frantically', 'typing frantically on tiny keyboard'),
('Having lightbulb moment', 'having eureka moment with tiny lightbulb above head, sparkles of inspiration'),
('Stretching & yawning', 'stretching and yawning adorably'),
('Doodling', 'doodling with tiny crayon, little doodles floating'),
('Peeking curiously', 'peeking curiously from behind'),
('Sipping tea', 'sipping tiny tea cup thoughtfully, tiny book nearby'),
('Gaming', 'intensely focused on tiny game controller, tiny game screen glow'),
('Celebrating', 'celebrating with tiny confetti, sparkles and glitter around'),
('Procrastinating', 'avoiding tasks playfully, tiny distractions around'),
('Cheering', 'cheering encouragingly with tiny pom-poms, hearts floating'),
('Snuggling blanket', 'wrapped in tiny cozy blanket, tiny comfort plushie nearby'),
-- Gym activities
('Lifting weights', 'lifting tiny dumbbells with effort, determined expression'),
('Running on treadmill', 'running on tiny treadmill, focused and sweaty'),
('Doing yoga', 'doing yoga pose on tiny mat, balanced and peaceful'),
('Stretching at gym', 'doing stretches at gym, athletic and flexible'),
-- Office activities
('Attending meeting', 'in tiny office chair at meeting, holding tiny notepad'),
('Drinking office coffee', 'at tiny desk with coffee mug, office papers around'),
('Typing on laptop', 'typing on tiny laptop at desk, focused work mode'),
('Taking coffee break', 'relaxing with coffee at tiny break area'),
-- Garden activities
('Watering plants', 'watering tiny plants with small watering can'),
('Planting flowers', 'planting tiny seeds in soil, gardening gloves on'),
('Relaxing in garden', 'resting on tiny garden bench, flowers around'),
('Picking flowers', 'picking tiny flowers into small basket'),
-- Car activities
('Driving', 'driving tiny car with paws on wheel, focused on road'),
('Road trip', 'in tiny car with snacks and music, adventure vibes'),
('Traffic jam', 'stuck in tiny car looking bored, tapping wheel'),
('Car singing', 'singing loudly in tiny car, happy and carefree'),
-- Disco activities
('Disco dancing', 'disco dancing under tiny disco ball, groovy moves'),
('DJ-ing', 'DJ-ing with tiny turntables, headphones on, music vibes'),
('Party vibes', 'dancing at party with tiny drink, celebration mode'),
-- Sport activities
('Playing soccer', 'kicking tiny soccer ball, athletic pose'),
('Playing basketball', 'shooting tiny basketball, sporty and focused'),
('Swimming', 'swimming with tiny floaties, splashing happily'),
('Playing tennis', 'swinging tiny tennis racket, competitive spirit');

-- Insert Social Moods
INSERT INTO dim_social_mood (mood_name, prompt_text) VALUES
('Energetic & Buzzing', 'energetic and buzzing expression, energy sparkles'),
('Chill & Relaxed', 'chill and relaxed expression, peaceful aura'),
('Giggly & Silly', 'giggly and silly expression, playful vibes'),
('Curious & Exploring', 'curious and exploring expression, wonder-filled'),
('Focused & Intense', 'focused and intense expression, determined'),
('Sleepy & Cozy', 'sleepy and cozy expression, drowsy and comfortable'),
('Excited & Bouncy', 'excited and bouncy expression, joyful'),
('Contemplative', 'contemplative and thoughtful expression, reflective'),
('Playful & Mischievous', 'playful and mischievous expression, sly and fun'),
('Content & Happy', 'content and happy expression, satisfied');

-- Insert Color Schemes
INSERT INTO dim_color_scheme (scheme_name, prompt_text) VALUES
('Pastel Dreams', 'soft pastel pink and cream colors'),
('Bright & Poppy', 'bright poppy orange and yellow colors'),
('Cool & Calm', 'cool calm teal and mint green colors'),
('Warm & Friendly', 'warm friendly orange and cream colors'),
('Cozy Neutrals', 'cozy neutral beige and cream colors'),
('Soft Blues', 'soft pastel blue and lavender colors'),
('Vibrant Pink', 'bright poppy pink and purple colors'),
('Rainbow', 'pastel rainbow multi-color'),
('Grey & Blue', 'cozy neutral grey and soft blue colors'),
('Earthy Greens', 'earthy green and brown colors');

-- Insert Special Quirks
INSERT INTO dim_special_quirk (quirk_name, prompt_text) VALUES
('Wearing headphones', 'tiny headphones on head'),
('Holding phone', 'tiny phone in hand'),
('With comfort blanket', 'tiny comfort blanket nearby'),
('Sparkles when happy', 'sparkles around body when happy'),
('Has tiny glasses', 'wearing tiny round glasses'),
('Wears tiny hat', 'wearing tiny cute hat'),
('Carries tiny bag', 'carrying tiny backpack or bag'),
('Glows softly', 'soft gentle glow emanating'),
('Has expressive ears', 'big expressive ears or antenna'),
('Leaves heart trail', 'tiny hearts floating behind');

-- Insert Size Categories
INSERT INTO dim_size_category (size_name, prompt_text) VALUES
('Pocket-sized', 'pocket-sized, fits in palm'),
('Desktop Buddy', 'desktop buddy size, fits on keyboard'),
('Lap Companion', 'lap companion size, cat-sized'),
('Cushion Friend', 'cushion friend size, medium pillow size');

-- Create new creature_prompts table (the family/template)
CREATE TABLE IF NOT EXISTS creature_prompts (
  id SERIAL PRIMARY KEY,
  body_type_id INTEGER REFERENCES dim_body_type(id),
  activity_id INTEGER REFERENCES dim_social_activity(id),
  mood_id INTEGER REFERENCES dim_social_mood(id),
  color_scheme_id INTEGER REFERENCES dim_color_scheme(id),
  quirk_id INTEGER REFERENCES dim_special_quirk(id),
  size_id INTEGER REFERENCES dim_size_category(id),
  prompt TEXT NOT NULL,
  negative_prompt TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(body_type_id, activity_id, mood_id, color_scheme_id, quirk_id, size_id)
);

-- Modify creatures table to reference creature_prompts
ALTER TABLE creatures DROP COLUMN IF EXISTS species_id;
ALTER TABLE creatures DROP COLUMN IF EXISTS subspecies_id;
ALTER TABLE creatures DROP COLUMN IF EXISTS colouring_id;
ALTER TABLE creatures DROP COLUMN IF EXISTS style_id;
ALTER TABLE creatures DROP COLUMN IF EXISTS mood_id;
ALTER TABLE creatures DROP COLUMN IF EXISTS motion_type_id;
ALTER TABLE creatures DROP COLUMN IF EXISTS elemental_affinity_id;
ALTER TABLE creatures DROP COLUMN IF EXISTS environment_id;

-- Add prompt_id to creatures
ALTER TABLE creatures ADD COLUMN IF NOT EXISTS prompt_id INTEGER REFERENCES creature_prompts(id);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_creatures_prompt ON creatures(prompt_id);
CREATE INDEX IF NOT EXISTS idx_creature_prompts_dimensions ON creature_prompts(body_type_id, activity_id, mood_id, color_scheme_id);

-- Comments
COMMENT ON TABLE creature_prompts IS 'Prompt templates - one prompt can generate multiple creature variations (family)';
COMMENT ON TABLE creatures IS 'Individual creatures - multiple creatures can share the same prompt (siblings in a family)';
COMMENT ON COLUMN creatures.prompt_id IS 'Links to the prompt template used to generate this creature';
