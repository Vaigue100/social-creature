# Perchance vs Stable Diffusion - Comparison Guide

## Quick Comparison

| Feature | Perchance | Stable Diffusion (Local) |
|---------|-----------|--------------------------|
| **Cost** | Free, unlimited | Free (hardware cost) |
| **Setup** | Instant (pip install) | Complex (WebUI, model download) |
| **Speed** | ~5-10s per image | ~4-6s per image (RTX 4070) |
| **Quality** | Good, consistent | Excellent, configurable |
| **Hardware** | None required | RTX 4070 or better |
| **API Key** | Not required | Not required (local) |
| **Internet** | Required | Not required |
| **Control** | Limited | Full (samplers, steps, etc.) |

## Perchance Advantages

### ✅ Better For You If:
1. **No powerful GPU** - Works on any computer
2. **Quick testing** - Want to test prompts fast
3. **Consistent style** - Perchance has consistent output
4. **Zero setup** - Just `pip install perchance` and go
5. **No local storage** - Don't need 10GB+ model files

### Generation Example:
```bash
cd chatlings/scripts
python batch_generate_perchance.py
```

## Stable Diffusion Advantages

### ✅ Better For Large Scale Generation:
1. **Faster** - ~30% faster with RTX 4070
2. **Offline** - Works without internet
3. **Better quality** - More control over output
4. **Customizable** - Can adjust every parameter
5. **Model choice** - Use specialized models

### Generation Example:
```bash
cd chatlings/scripts
python batch_generate_images.py
```

## Recommendation

### For Testing (1-100 images):
**Use Perchance** - Faster to set up, good quality

### For Production (1000s of images):
**Use Stable Diffusion** - Faster generation, better quality

### For Your 21,259 Creatures:
**Hybrid Approach:**
1. Test 10-20 creatures with Perchance first
2. Refine prompts based on results
3. Generate all images with Stable Diffusion on gaming PC

## Usage Examples

### Perchance (Anywhere):
```bash
# Install once
pip install perchance

# Generate images
python batch_generate_perchance.py

# Outputs to: chatlings/artwork/
# Tracking: perchance_images_created.csv
```

### Stable Diffusion (Gaming PC only):
```bash
# Start WebUI
cd C:\AI\stable-diffusion-webui
webui-user.bat

# In another terminal:
cd C:\social-creature\chatlings\scripts
python batch_generate_images.py

# Outputs to: chatlings/artwork/
# Tracking: creature_images_created.csv
```

## Performance Estimates

### Perchance
- **Per creature (9 images):** ~60-90 seconds
- **1,000 creatures:** ~16-25 hours
- **21,259 creatures:** ~355-530 hours (~15-22 days)

### Stable Diffusion (RTX 4070)
- **Per creature (9 images):** ~40-60 seconds
- **1,000 creatures:** ~11-17 hours
- **21,259 creatures:** ~235-360 hours (~10-15 days)

## Tips

### For Perchance:
- Add 1-second delays between requests (already in script)
- Can run on laptop while doing other work
- Internet connection required
- Free and unlimited (as of 2024)

### For Stable Diffusion:
- Keep WebUI running during generation
- GPU will be at 90-100% usage
- Can pause/resume anytime
- Best quality with DPM++ SDE Karras sampler

## Which Should You Use?

**Try both on 10 creatures and compare!**

Then use whichever gives you better results for the full batch.
