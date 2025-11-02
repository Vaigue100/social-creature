# Chatlings Art Generation System - Complete Setup

## ✅ What Was Created

### 1. Database Tables
- **`creature_artwork`** - Tracks generated artwork
  - Links to creature ID
  - Stores 9 images per creature (image_number 1-9)
  - Records file paths, sizes, prompts
  - Timestamps generation

- **Views:**
  - `creatures_with_artwork` - Shows creatures and their artwork count
  - `creatures_without_artwork` - Shows creatures needing artwork (for random selection)

### 2. Folder Structure
```
chatlings/
└── artwork/                    # Generated images stored here
    ├── README.md              # Documentation
    └── [creature_id]_1.png    # Image files
    └── [creature_id]_2.png
    └── ... (9 images per creature)
```

### 3. Python Service
- **`scripts/generate_creature_art.py`** - Main generation service
  - Picks random creature without artwork
  - Generates prompts from creature attributes
  - Creates 9 images using Perchance API
  - Saves images with naming: `[creature_id]_[1-9].png`
  - Records artwork in database

### 4. Batch Script
- **`scripts/bat/generate_art.bat`** - Easy launcher
  - Checks Python installation
  - Installs dependencies automatically
  - Runs the generation service

### 5. Requirements File
- **`scripts/requirements.txt`**
  - `psycopg2-binary` - PostgreSQL database access
  - `perchance` - Unofficial Perchance API

## 🎨 Art Generation Specifications

### Style
- **Art Style:** "Cute Figurine"
- **Applied to all creatures**

### Prompts Generated From:
1. **Subspecies** (e.g., Lion, Dragon, Pixel Pet)
2. **Mood** (e.g., Proud, Aggressive, Playful)
3. **Style** (e.g., Gothic, Naturalistic, Cyberpunk)
4. **Colors** (e.g., Gold & brown, Silver & gold)
5. **Motion/Pose** (e.g., Roaring stance, Floating pose)
6. **Elemental Affinity** (e.g., Fire accents, Digital patterns)
7. **Rarity-based quality** (Legendary = highest detail)

### Negative Prompt
Avoids: `blurry, low quality, distorted, ugly, bad anatomy, text, watermark, realistic photo, scary, creepy, horror`

### Images Per Creature
- **9 images** per creature
- Slightly varied each time due to AI randomness
- Same prompt used for consistency

## 🚀 How to Use

### Quick Start
```batch
cd chatlings\scripts\bat
generate_art.bat
```

This will:
1. Check Python is installed
2. Install required packages (if needed)
3. Pick a random creature without artwork
4. Generate 9 images
5. Save to `artwork/` folder
6. Record in database

### Run Multiple Times
Each run generates art for one creature. Run multiple times to generate more:
```batch
generate_art.bat
# Wait for completion
generate_art.bat
# Repeat...
```

### Check Progress

**In pgAdmin:**
```sql
-- See how many creatures have artwork
SELECT
  COUNT(DISTINCT c.id) as total_creatures,
  COUNT(DISTINCT ca.creature_id) as with_artwork,
  COUNT(DISTINCT c.id) - COUNT(DISTINCT ca.creature_id) as remaining
FROM creatures c
LEFT JOIN creature_artwork ca ON c.id = ca.creature_id;

-- View creatures with artwork
SELECT * FROM creatures_with_artwork ORDER BY artwork_count DESC;

-- View creatures still needing artwork
SELECT * FROM creatures_without_artwork LIMIT 10;

-- View all generated artwork
SELECT
  ca.*,
  c.creature_name,
  c.creature_shortname
FROM creature_artwork ca
JOIN creatures c ON ca.creature_id = c.id
ORDER BY ca.generated_at DESC;
```

## 📊 Example Prompts

### Legendary Proud Gold Lion
```
Cute Figurine style, a proud lion, with realistic natural details,
gold and brown colors, in roaring pose, with fire accents,
highly detailed, premium quality, perfect lighting
```

### Epic Aggressive Cyber Dragon
```
Cute Figurine style, an aggressive cyber dragon, with neon technological details,
black and neon green colors, in dynamic pose, with electric details,
very detailed, high quality, great lighting
```

### Common Playful Pixel Pet
```
Cute Figurine style, a playful pixel pet, with clean simple design,
gold and brown colors, in dynamic pose, with digital patterns,
clean, cute
```

## ⚙️ Technical Details

### Service Flow
1. **Query database** → Find creature without artwork
2. **Build prompt** → Combine creature attributes + "Cute Figurine" style
3. **Call Perchance API** → Generate 9 variations
4. **Save images** → Format: `[creature_id]_[1-9].png`
5. **Update database** → Record artwork metadata

### Database Schema
```sql
CREATE TABLE creature_artwork (
    id UUID PRIMARY KEY,
    creature_id UUID REFERENCES creatures(id),
    image_filename VARCHAR(255),
    image_number INTEGER CHECK (image_number BETWEEN 1 AND 9),
    file_path VARCHAR(500),
    file_size_bytes BIGINT,
    generation_prompt TEXT,
    negative_prompt TEXT,
    art_style VARCHAR(100) DEFAULT 'Cute Figurine',
    generated_at TIMESTAMP,
    UNIQUE(creature_id, image_number)
);
```

### Perchance API
- **Free, unlimited** image generation
- **No sign-up** required
- **No watermarks**
- Uses unofficial Python wrapper
- May be rate-limited if too fast

## 📝 Notes

### First Run
- Will automatically install `perchance` and `psycopg2-binary`
- May take a moment to download packages

### Generation Time
- ~1-2 minutes per creature (9 images)
- Depends on Perchance server load

### Storage
- Each image: ~500KB - 2MB
- 9 images per creature: ~5-15MB
- 1,259 creatures total: ~6-19GB estimated

### Automation
To generate artwork for all creatures, you could:
1. Run manually multiple times
2. Create a loop in the batch script
3. Schedule with Windows Task Scheduler
4. Run `for /L %i in (1,1,1259) do generate_art.bat`

## 🔧 Troubleshooting

### "Python is not installed"
- Download from: https://python.org/
- Install and restart command prompt

### "Module 'perchance' not found"
- Run: `pip install perchance psycopg2-binary`

### "Database connection failed"
- Check PostgreSQL is running
- Verify password: `!1Swagger!1`

### "All creatures have artwork"
- Success! All 1,259 creatures have been generated
- To regenerate, delete records from `creature_artwork` table

## 🎯 Next Steps

1. **Test the service:**
   ```batch
   cd scripts\bat
   generate_art.bat
   ```

2. **Review generated images:**
   - Check `chatlings/artwork/` folder
   - Verify image quality

3. **Generate more:**
   - Run script multiple times
   - Or automate with loop

4. **Alternative AI services:**
   - If Perchance doesn't work well, can switch to:
     - Kaiber (commercial, better quality)
     - Stable Diffusion (local generation)
     - Replicate API (cloud-based)

## 📚 Files Created

```
chatlings/
├── artwork/
│   └── README.md
├── scripts/
│   ├── generate_creature_art.py        # Main service
│   ├── requirements.txt                # Python dependencies
│   ├── bat/
│   │   └── generate_art.bat           # Launcher
│   └── sql/
│       ├── 05_create_artwork_table.sql
│       └── 06_update_artwork_table_for_9_images.sql
└── ART_GENERATION_SETUP.md            # This file
```

Ready to generate! 🎨✨
