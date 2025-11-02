-- Add more variety to Chatlings database
-- New subspecies, colors, moods, styles, etc.

-- Add new subspecies
INSERT INTO dim_subspecies (subspecies_name, description) VALUES
('Robot', 'Mechanical creature with gears and circuits'),
('Cyborg', 'Half-organic, half-machine hybrid'),
('Sprite', 'Magical fairy-like creature'),
('Golem', 'Stone or clay animated creature'),
('Phantom', 'Ghostly ethereal being'),
('Automaton', 'Clockwork mechanical being'),
('Wisp', 'Small glowing spirit'),
('Construct', 'Magically assembled creature'),
('Homunculus', 'Tiny artificial humanoid'),
('Elemental', 'Pure elemental energy being')
ON CONFLICT (subspecies_name) DO NOTHING;

-- Add more color combinations
INSERT INTO dim_colouring (colouring_name, hex_primary, hex_secondary) VALUES
('Purple & pink', '#9B59B6', '#E91E63'),
('Orange & yellow', '#FF9800', '#FFEB3B'),
('Teal & cyan', '#009688', '#00BCD4'),
('Red & black', '#F44336', '#212121'),
('White & blue', '#FFFFFF', '#2196F3'),
('Green & yellow', '#4CAF50', '#FFEB3B'),
('Pink & white', '#E91E63', '#FFFFFF'),
('Navy & gold', '#283593', '#FFD700'),
('Emerald & silver', '#50C878', '#C0C0C0'),
('Coral & turquoise', '#FF7F50', '#40E0D0')
ON CONFLICT (colouring_name) DO NOTHING;

-- Add more moods
INSERT INTO dim_mood (mood_name, description) VALUES
('Playful', 'Fun-loving and energetic'),
('Mischievous', 'Sneaky and troublemaking'),
('Serene', 'Calm and peaceful'),
('Curious', 'Inquisitive and exploring'),
('Sleepy', 'Drowsy and relaxed'),
('Excited', 'Enthusiastic and eager'),
('Grumpy', 'Irritable and moody'),
('Cheerful', 'Happy and bright'),
('Shy', 'Timid and reserved'),
('Confident', 'Bold and self-assured')
ON CONFLICT (mood_name) DO NOTHING;

-- Add more styles
INSERT INTO dim_style (style_name, description) VALUES
('Steampunk', 'Victorian-era mechanical aesthetic'),
('Vaporwave', 'Retro-futuristic pastel aesthetic'),
('Kawaii', 'Ultra-cute Japanese style'),
('Glitch', 'Digital corruption aesthetic'),
('Crystal', 'Gemstone and crystalline'),
('Fluffy', 'Soft and fuzzy texture'),
('Chibi', 'Super-deformed cute proportions'),
('Pastel', 'Soft muted colors')
ON CONFLICT (style_name) DO NOTHING;

-- Add more motion types
INSERT INTO dim_motion_type (motion_name, description) VALUES
('Bouncing', 'Jumping up and down'),
('Spinning', 'Rotating in circles'),
('Floating gently', 'Hovering peacefully'),
('Dancing', 'Moving rhythmically'),
('Sitting', 'Resting pose'),
('Running', 'Fast movement'),
('Waving', 'Friendly gesture'),
('Sleeping', 'Resting peacefully'),
('Playing', 'Playful movement')
ON CONFLICT (motion_name) DO NOTHING;

-- Add more elemental affinities
INSERT INTO dim_elemental_affinity (affinity_name, description) VALUES
('Crystal', 'Gemstone energy'),
('Sound', 'Musical vibrations'),
('Dream', 'Sleep and visions'),
('Void', 'Empty space energy'),
('Chaos', 'Random energy'),
('Order', 'Structured energy')
ON CONFLICT (affinity_name) DO NOTHING;
