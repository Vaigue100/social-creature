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
- For each prompt, creates 10 creatures (1000 total creatures)
- Creatures are "siblings" - they share the same prompt
- You can keep as many images as you like per prompt (1-10)

### Step 3: Export Prompts for Perchance
```bash
node export-prompts-for-perchance.js
```

**Output:** `chatlings/artwork/perchance_prompts.csv`
- One prompt per line (no headers, no IDs)
- Ready to copy/paste into Perchance

### Step 4: Start the Auto-Import Watcher
```bash
cd chatlings
node perchance-watcher.js
```

**What this does:**
- Automatically watches the `artwork/` folder for new ZIP files
- Processes them immediately when they appear
- Runs in the background - leave it running!

### Step 5: Generate Images on Perchance (Web Browser)

1. Open Perchance AI Image Generator in your browser
2. Copy a prompt from `perchance_prompts.csv`
3. Paste into Perchance and generate images
4. Keep as many as you like (1-10 images per prompt)
5. Download as ZIP
6. Save ZIP to `chatlings/artwork/` folder
7. **The watcher will automatically process it!**

**Automatic Processing:**
- Watcher detects new ZIP file
- Extracts images and JSON metadata
- Matches prompts to database
- Assigns images to creatures in the family
- Moves processed ZIP to `artwork/processed_zips/`
- Logs all activity in real-time

You can repeat Step 5 for each prompt - just paste, generate, keep your favorites, download, and drop into the folder!

---

## File Structure

```
chatlings/
├── artwork/
│   ├── perchance_prompts.csv         (exported prompts)
│   ├── *.zip                          (Perchance downloads - drop here!)
│   ├── processed_zips/                (auto-archived after processing)
│   ├── extracted/                     (auto-created during import)
│   ├── linked/                        (selected images)
│   └── discarded/                     (rejected images - from manual review)
│
├── scripts/
│   ├── sql/
│   │   └── 13_social_dimensions.sql   (NEW migration)
│   ├── generate-social-chatlings.js   (NEW generator)
│   ├── export-prompts-for-perchance.js (NEW exporter)
│   └── import-perchance-zip.js        (manual import - deprecated)
│
├── perchance-watcher.js               (NEW auto-import watcher)
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

**10 Creatures Generated (same prompt - the family):**
- Cheerful Bean (UUID: abc123...) ← Gets image
- Happy Puff (UUID: def456...) ← Gets image
- Cozy Blob (UUID: ghi789...) ← Gets image
- Sunny Nugget (UUID: jkl012...)
- Bouncy Cloud (UUID: mno345...)
- Snuggly Orb (UUID: pqr678...)
- Giggly Mochi (UUID: stu901...)
- Friendly Sprite (UUID: vwx234...)
- Sweet Dumpling (UUID: yza567...)
- Peppy Wisp (UUID: bcd890...)

**You Generate on Perchance & Keep 3 Images**

**Perchance Output (ZIP saved to artwork/):**
```
cozy-coffee-1.json  →  Contains the prompt
cozy-coffee-1.jpg   →  Auto-assigned to Cheerful Bean
cozy-coffee-2.jpg   →  Auto-assigned to Happy Puff
cozy-coffee-3.jpg   →  Auto-assigned to Cozy Blob
```

**Watcher Processes Automatically:**
```
[2025-01-05 10:23:15] 📦 Processing: cozy-coffee.zip
[2025-01-05 10:23:16]    ✓ Extracted to: cozy-coffee
[2025-01-05 10:23:16]    Found 3 image(s) in ZIP
[2025-01-05 10:23:17]    ✅ Assigned: Cheerful Bean
[2025-01-05 10:23:17]    ✅ Assigned: Happy Puff
[2025-01-05 10:23:17]    ✅ Assigned: Cozy Blob
[2025-01-05 10:23:17]    ✓ Completed: 3 assigned, 0 skipped
[2025-01-05 10:23:17]    ✓ Archived to: processed_zips/cozy-coffee.zip
```

**Final Files:**
```
artwork/linked/abc123.jpg        (Cheerful Bean)
artwork/linked/def456.jpg        (Happy Puff)
artwork/linked/ghi789.jpg        (Cozy Blob)
artwork/processed_zips/cozy-coffee.zip
```

**Remaining 7 creatures still need images** - you can generate more later or leave them!

---

## Benefits

✅ **Faster Generation**: 1 Perchance prompt → 10 creatures (keep as many as you like!)
✅ **Better Quality**: Perchance consistently produces better images
✅ **Fully Automated**: Drop ZIP files in folder, watcher handles everything
✅ **Simpler Prompts**: Social media themes are easier to visualize
✅ **Logical Grouping**: Creatures in "families" share characteristics
✅ **Flexible**: Keep 1-10 images per prompt, whatever looks best
✅ **Scalable**: Easy to generate thousands of creatures
✅ **Real-time Processing**: See images assigned as soon as you download

---

## Next Steps

1. Run the migration and generate test batch (10 prompts = 100 creatures)
2. Start the watcher service (`node perchance-watcher.js`)
3. Generate a few images on Perchance, keep your favorites
4. Drop ZIP files into artwork folder
5. Watch the watcher automatically process them!
6. Review results in admin console (optional)
7. If quality is good, scale up to 1000+ prompts
8. Build out the full collection!
