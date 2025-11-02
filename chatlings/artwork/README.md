# Chatlings Artwork

This folder contains AI-generated artwork for Chatlings creatures.

## Organization

Each creature gets 9 images:
- `[creature_id]_1.png` through `[creature_id]_9.png`

## Generation Details

- **Art Style:** Cute Figurine
- **AI Service:** Perchance.org (unofficial API)
- **Images per creature:** 9
- **Format:** PNG

## Generated Prompts

Each image is generated using:
1. **Main prompt:** Based on creature attributes (subspecies, colors, style, mood, elements)
2. **Negative prompt:** Things to avoid (blur, distortion, scary elements, etc.)
3. **Style modifier:** "Cute Figurine" style applied to all

## Database Tracking

All generated artwork is tracked in the `creature_artwork` table:
- Links to creature ID
- Stores file path and size
- Records generation prompt
- Tracks timestamp

## Usage

### Generate art for one random creature:
```batch
cd scripts\bat
generate_art.bat
```

### View creatures without artwork:
```sql
SELECT * FROM creatures_without_artwork LIMIT 10;
```

### View creatures with artwork:
```sql
SELECT * FROM creatures_with_artwork;
```

### Check how many creatures have artwork:
```sql
SELECT
  COUNT(*) as total_creatures,
  COUNT(DISTINCT ca.creature_id) as with_artwork,
  COUNT(*) - COUNT(DISTINCT ca.creature_id) as without_artwork
FROM creatures c
LEFT JOIN creature_artwork ca ON c.id = ca.creature_id;
```

## Image Examples

Images are generated with prompts like:

**Example 1: Proud Gold Lion**
```
Cute Figurine style, a proud lion, with realistic natural details,
gold and brown colors, in roaring pose, with fire accents,
highly detailed, premium quality, perfect lighting
```

**Example 2: Aggressive Glitch Creature**
```
Cute Figurine style, an aggressive glitch creature, with neon
technological details, gold and brown colors, in dynamic pose,
with digital patterns, very detailed, high quality
```

## Notes

- First run will install required Python packages (`perchance`, `psycopg2-binary`)
- Generation uses Perchance's unofficial API (free, unlimited)
- Each creature takes ~1-2 minutes to generate all 9 images
- Images are automatically tracked in the database
