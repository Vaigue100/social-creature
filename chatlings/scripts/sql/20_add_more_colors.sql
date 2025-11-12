-- Migration 20: Add more color schemes

INSERT INTO dim_color_scheme (scheme_name, prompt_text) VALUES
('Gold & Shimmer', 'shimmering gold and bronze tones'),
('Rose Gold', 'elegant rose gold metallic finish'),
('Bronze & Copper', 'warm bronze and copper metallic'),
('Pearl White', 'lustrous pearl white with soft iridescence'),
('Emerald Green', 'rich emerald green with gold accents'),
('Sapphire Blue', 'deep sapphire blue with silver highlights'),
('Ruby Red', 'brilliant ruby red with golden sparkles'),
('Amethyst Purple', 'mystical amethyst purple with shimmer'),
('Obsidian Black', 'glossy obsidian black with hints of purple'),
('Ivory Cream', 'soft ivory and cream with warm undertones'),
('Mint Fresh', 'fresh mint green and white'),
('Coral Sunset', 'warm coral and peach sunset colors'),
('Forest Depths', 'deep forest green and brown'),
('Ocean Waves', 'ocean blue and seafoam green'),
('Fire Blaze', 'fiery red orange and yellow'),
('Ice Crystal', 'cool ice blue and white with sparkles'),
('Shadow & Mystery', 'dark shadowy grays and deep purples'),
('Lavender Dream', 'soft lavender and lilac tones'),
('Cosmic Galaxy', 'cosmic purple blue and starry accents'),
('Autumn Leaves', 'autumn orange brown and golden yellow');

SELECT 'Added New Colors' as status, COUNT(*) as total FROM dim_color_scheme;
