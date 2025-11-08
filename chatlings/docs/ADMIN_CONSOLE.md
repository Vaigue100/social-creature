# Chatlings Admin Console - Image Selection

## Quick Start

1. **Start the server:**
   ```bash
   cd chatlings
   node admin-server.js
   ```

2. **Open in browser:**
   ```
   http://localhost:3000
   ```

3. **Select images:**
   - Click on one of the 4 images to select it as the primary image
   - Or press keyboard keys `1`, `2`, `3`, or `4`
   - The page auto-advances to the next creature immediately (no extra click needed)

## Features

### Image Grid
- Shows 4 generated images for each creature in a 2x2 grid
- Large, clear preview of each image
- Numbered 1-4 for easy keyboard selection

### Creature Info Panel
- **Creature Name** - The unique name
- **Rarity** - Color-coded badge (Legendary, Epic, Rare, Uncommon, Common)
- **Subspecies** - Base creature type
- **Coloring** - Color scheme
- **Style** - Visual style (Naturalistic, Gothic, Mecha, etc.)
- **Mood** - Emotional state
- **Motion** - Animation type
- **Element** - Elemental affinity
- **Environment** - Natural habitat

This info helps you pick the image that best represents the creature's characteristics.

### Progress Tracking
- Top bar shows percentage complete
- Text shows: X / Y completed (Z remaining)
- Updates in real-time as you work

### Auto-Advance
- No extra clicks needed between creatures
- Click or press key → automatically loads next creature
- Speeds up the selection process significantly

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1` | Select first image (top-left) |
| `2` | Select second image (top-right) |
| `3` | Select third image (bottom-left) |
| `4` | Select fourth image (bottom-right) |

## Database

The selected image filename is stored in the `creatures.selected_image` column.

Example: `12345_2.jpg` means image #2 was selected for creature ID 12345.

## Tips for Fast Selection

1. **Use keyboard shortcuts** - Much faster than clicking
2. **Look for best representation** - Consider the creature's characteristics shown in the info panel
3. **Check framing** - Full body visible, creature centered
4. **Check quality** - Clear, good composition, no artifacts
5. **No stands/pedestals** - Creature should look alive, not like a toy

## Workflow Estimate

- **Total creatures:** 21,259 (assuming all have 4 images generated)
- **Time per selection:** ~5-10 seconds with keyboard
- **Total time:** ~30-60 hours

Consider splitting this work:
- Do high-value rarities first (Legendary, Epic)
- Take breaks every hour
- Can stop/resume anytime - progress is saved

## Troubleshooting

**Server won't start:**
- Check if port 3000 is already in use
- Make sure PostgreSQL is running
- Check `.env` file has correct database credentials

**Images not loading:**
- Verify images exist in `chatlings/artwork/` folder
- Check file naming: `{creature_id}_{1-4}.jpg`

**No creatures showing:**
- All creatures may already have selected images
- Check database: `SELECT COUNT(*) FROM creatures WHERE selected_image IS NULL;`

## API Endpoints

The server provides these endpoints:

- `GET /api/next-creature` - Get next unreviewed creature
- `POST /api/select-image` - Save selected image
- `GET /api/stats` - Get progress statistics

## Stopping the Server

Press `Ctrl+C` in the terminal running the server.

Progress is saved after each selection, so you can stop/resume anytime.
