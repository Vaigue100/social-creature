# Gaming PC - Image Generation Setup

Complete guide for generating all 11,331 creature images using your RTX 4070.

## What You Have

✅ **1,259 creatures** with detailed AI prompts
✅ **Queue file**: `artwork/creature_prompts_queue.csv`
✅ **Batch script**: `scripts/batch_generate_images.py`
✅ **Target**: 9 images per creature = **11,331 total images**

## Prerequisites

- RTX 4070 (12GB VRAM) ✓
- Stable Diffusion WebUI installed ✓
- Model downloaded (Dreamshaper recommended) ✓

## Setup Steps

### 1. Clone Repository

```bash
cd C:\
git clone https://github.com/Vaigue100/social-creature.git
cd social-creature
```

### 2. Install Python Dependencies

```bash
pip install -r chatlings/scripts/requirements.txt
```

### 3. Start Stable Diffusion WebUI with API

```bash
cd C:\AI\stable-diffusion-webui
webui-user.bat
```

**Make sure `webui-user.bat` has `--api` flag:**
```batch
set COMMANDLINE_ARGS=--xformers --api
```

Wait for browser to open at `http://localhost:7860`

### 4. Select Your Model

In the WebUI:
1. Top left dropdown: Select your model (e.g., "Dreamshaper")
2. Leave the tab open while generating

### 5. Run Batch Generation

```bash
cd C:\social-creature\chatlings\scripts
python batch_generate_images.py
```

## What Happens

The script will:
1. ✅ Check Stable Diffusion API is running
2. ✅ Load the queue (1,259 creatures)
3. ✅ Skip any already completed
4. ✅ Generate 9 images per creature
5. ✅ Save to `chatlings/artwork/`
6. ✅ Track progress in `creature_images_created.csv`

**Can be stopped and resumed anytime!** (Ctrl+C to stop)

## Performance

With RTX 4070:
- **~3-5 seconds per image**
- **~30-45 seconds per creature** (9 images)
- **~10-16 hours total** for all 1,259 creatures
- Can run overnight!

## Output

Images saved as:
```
chatlings/artwork/
├── {creature_id}_1.png
├── {creature_id}_2.png
├── ...
├── {creature_id}_9.png
```

## Example Prompts

The script uses detailed prompts like:

**Creature: Proud Phase Shifter**
```
cute figurine style, proud phase shifter character,
gold and brown color scheme, fierce roar pose,
subtle fire effects, warm glow, flame accents,
riverbank background, studio lighting, soft shadows,
high quality lighting, very detailed, high quality,
great textures, professional, white background,
centered composition, 3D render style
```

**Negative Prompt:**
```
blurry, low quality, distorted, ugly, bad anatomy,
text, watermark, realistic photo, scary, creepy,
horror, human, person, nsfw
```

## Settings

The script uses (in `batch_generate_images.py`):
- **Steps**: 30
- **Sampler**: DPM++ 2M Karras
- **CFG Scale**: 7
- **Resolution**: 512x512
- **Seed**: Random (for variety)

You can adjust these if needed!

## Troubleshooting

### "API not available"
- Make sure WebUI is running
- Check `--api` flag in `webui-user.bat`
- Restart WebUI

### Images look wrong
- Try different model (download from Hugging Face)
- Adjust settings in script
- Change CFG scale (lower = more creative, higher = follow prompt more)

### Too slow
- Lower steps to 20
- Reduce resolution to 448x448
- Use faster sampler (Euler a)

### Out of memory
- Lower resolution
- Close other programs
- Add `--medvram` flag to webui-user.bat

## Progress Tracking

Check progress anytime:
```bash
# Count completed images
cd chatlings/artwork
ls *.png | wc -l

# Or on Windows
dir *.png /b | find /c ".png"
```

Should eventually reach **11,331 images!**

## After Generation

Once complete, you can:
1. Review images in `artwork/` folder
2. Upload to cloud storage
3. Use in your app/game
4. Regenerate any you don't like (delete from tracking CSV)

## Tips

- **Run overnight**: Start before bed, finish by morning
- **Test first**: Run for 10 minutes, check quality, then continue
- **Monitor GPU**: Use Task Manager to see GPU usage (~99% is good)
- **Save electricity**: RTX 4070 uses ~200W, ~3.5 kWh for full run

Happy generating! 🎨✨
