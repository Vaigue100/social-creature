# Social Chatlings - New Workflow

## Overview

The system has been completely redesigned for **social media-themed creatures** with a more efficient Perchance-based image generation workflow.

### Key Changes

1. **New Dimensions**: Replaced fantasy themes with social media activities
2. **Prompt Families**: One prompt generates multiple creatures (siblings)
3. **Perchance Integration**: Streamlined workflow for web-based generation

---

## New Dimensions

### Body Types (8 options)
- Floofy & Round
- Bean-shaped
- Blobby & Wiggly
- Long & Noodle-like
- Chubby & Squishy
- Spiky but Soft
- **Athletic** (NEW)
- Sleek & Smooth

### Social Activities (42 options)
**Basic:**
- Sipping coffee, Munching snacks, Scrolling phone, Dancing to music, Typing frantically, etc.

**Gym:**
- Lifting weights, Running on treadmill, Doing yoga, Stretching at gym

**Office:**
- Attending meeting, Drinking office coffee, Typing on laptop, Taking coffee break

**Garden:**
- Watering plants, Planting flowers, Relaxing in garden, Picking flowers

**Car:**
- Driving, Road trip, Traffic jam, Car singing

**Disco:**
- Disco dancing, DJ-ing, Party vibes

**Sport:**
- Playing soccer, Playing basketball, Swimming, Playing tennis

### Other Dimensions
- **Social Moods** (10): Energetic, Chill, Giggly, Curious, Focused, Sleepy, Excited, Contemplative, Playful, Content
- **Color Schemes** (10): Pastel Dreams, Bright & Poppy, Cool & Calm, etc.
- **Special Quirks** (10): Wearing headphones, Sparkles when happy, Has tiny glasses, etc.
- **Size Categories** (4): Pocket-sized, Desktop Buddy, Lap Companion, Cushion Friend

---

## Database Architecture

### Old Structure (DEPRECATED)
```
creatures (one-to-one with dimensions)
```

### New Structure
```
creature_prompts (template/family)
  ├── id (prompt_id)
  ├── body_type_id, activity_id, mood_id, color_scheme_id, quirk_id, size_id
  ├── prompt (full text)
  └── negative_prompt

creatures (many prompts can have multiple creatures)
  ├── id (creature_id, UUID)
  ├── creature_name
  ├── prompt_id (FK to creature_prompts)
  └── selected_image (filename)
```

**Example:**
- 1 prompt → 4 creatures (siblings in a family)
- All 4 share the same visual characteristics
- Each gets a unique image from Perchance
- Each has a unique name and creature_id

---

## Complete Workflow

### Step 1: Run Database Migration
```bash
cd chatlings/scripts
node run-migrations.js
# This will run migration 13_social_dimensions.sql
```

### Step 2: Generate Chatlings
```bash
node generate-social-chatlings.js
```

**What this does:**
- Creates 100 unique prompts in `creature_prompts` table
- For each prompt, creates 4 creatures (400 total creatures)
- Creatures are "siblings" - they share the same prompt

### Step 3: Export Prompts for Perchance
```bash
node export-prompts-for-perchance.js
```

**Output:** `chatlings/artwork/perchance_prompts.csv`
- One prompt per line (no headers, no IDs)
- Ready to copy/paste into Perchance

### Step 4: Generate Images on Perchance (Gaming PC)

1. Copy `perchance_prompts.csv` to your gaming PC
2. Open Perchance AI Image Generator
3. Paste each prompt one at a time
4. Generate 4 images per prompt (to match the 4 creatures)
5. Download as ZIP

### Step 5: Import Generated Images (Back on Laptop)

1. Copy the downloaded ZIP file to `chatlings/artwork/`
2. Run the import script:

```bash
node import-perchance-zip.js
```

**What this does:**
- Extracts ZIP files from `artwork/` folder
- Reads JSON files to get the prompt
- Matches prompt to database
- Finds creatures for that prompt (the "family")
- Assigns one JPEG per creature
- Renames JPEG to `{creature_id}.jpg`
- Moves to `artwork/linked/` folder
- Updates database with filename

---

## File Structure

```
chatlings/
├── artwork/
│   ├── perchance_prompts.csv         (exported prompts)
│   ├── *.zip                          (Perchance downloads - place here)
│   ├── extracted/                     (auto-created during import)
│   ├── linked/                        (selected images)
│   └── discarded/                     (rejected images)
│
├── scripts/
│   ├── sql/
│   │   └── 13_social_dimensions.sql   (NEW migration)
│   ├── generate-social-chatlings.js   (NEW generator)
│   ├── export-prompts-for-perchance.js (NEW exporter)
│   └── import-perchance-zip.js        (NEW importer)
│
└── admin/
    └── image-selection.html           (review interface)
```

---

## Example

**Prompt Created:**
```
cute fluffy round creature, soft pastel pink and cream colors,
sitting relaxed holding tiny coffee cup, content and happy expression,
tiny headphones on head, desktop buddy size, single creature only,
full body visible, stylized 3D art, charming friendly,
cute living creature, simple clean background, soft lighting
```

**4 Creatures Generated (same prompt):**
- Cheerful Bean (UUID: abc123...)
- Happy Puff (UUID: def456...)
- Cozy Blob (UUID: ghi789...)
- Sunny Nugget (UUID: jkl012...)

**Perchance Output (ZIP):**
```
image_001.json  →  Contains the prompt
image_001.jpg   →  Assigned to Cheerful Bean
image_002.jpg   →  Assigned to Happy Puff
image_003.jpg   →  Assigned to Cozy Blob
image_004.jpg   →  Assigned to Sunny Nugget
```

**Final Files:**
```
artwork/linked/abc123.jpg  (Cheerful Bean)
artwork/linked/def456.jpg  (Happy Puff)
artwork/linked/ghi789.jpg  (Cozy Blob)
artwork/linked/jkl012.jpg  (Sunny Nugget)
```

---

## Benefits

✅ **Faster Generation**: 1 Perchance prompt → 4 creatures
✅ **Better Quality**: Perchance consistently produces better images
✅ **Simpler Prompts**: Social media themes are easier to visualize
✅ **Logical Grouping**: Creatures in "families" share characteristics
✅ **Scalable**: Easy to generate thousands of creatures

---

## Next Steps

1. Test with a small batch (10 prompts = 40 creatures)
2. Review results in admin console
3. If quality is good, scale up to 1000+ prompts
4. Build out the full collection!
