#!/usr/bin/env python3
"""
Batch Generate Creature Images using Perchance AI
Reads from creature_prompts_queue.csv and generates 9 images per creature
Free, unlimited, no API key required!
"""

import asyncio
import csv
import os
from pathlib import Path
import time

try:
    from perchance import ImageGenerator
except ImportError:
    print("[ERROR] Perchance package not installed!")
    print("Install with: pip install perchance")
    exit(1)

# Configuration
QUEUE_FILE = Path(__file__).parent.parent / 'artwork' / 'creature_prompts_queue.csv'
OUTPUT_DIR = Path(__file__).parent.parent / 'artwork'
TRACKING_FILE = OUTPUT_DIR / 'perchance_images_created.csv'
IMAGES_PER_CREATURE = 4

async def generate_image(generator, prompt, negative_prompt):
    """Generate one image using Perchance"""
    try:
        # Use the new async context manager API
        async with await generator.image(
            prompt=prompt,
            negative_prompt=negative_prompt
        ) as result:
            # Download the binary data
            binary_data = await result.download()
            # Read all bytes
            image_bytes = binary_data.read()
            return image_bytes
    except Exception as e:
        raise Exception(f"Generation failed: {e}")

def load_completed_creatures():
    """Load list of already completed creatures"""
    completed = set()
    if TRACKING_FILE.exists():
        with open(TRACKING_FILE, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                completed.add(row['creature_id'])
    return completed

async def process_queue():
    """Process the creature queue and generate images"""

    OUTPUT_DIR.mkdir(exist_ok=True)

    # Load completed creatures
    completed = load_completed_creatures()
    print(f"Already completed: {len(completed)} creatures\n")

    # Read queue
    with open(QUEUE_FILE, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        creatures = list(reader)

    if not creatures:
        print("[ERROR] No creatures found in CSV file!")
        return

    # Check if required columns exist
    required_cols = ['creature_id', 'creature_name', 'prompt', 'negative_prompt']
    first_creature = creatures[0]
    missing_cols = [col for col in required_cols if col not in first_creature]

    if missing_cols:
        print(f"[ERROR] Missing columns in CSV: {missing_cols}")
        print(f"Available columns: {list(first_creature.keys())}")
        return

    total_creatures = len(creatures)
    remaining = [c for c in creatures if c['creature_id'] not in completed]

    print(f"Total creatures: {total_creatures}")
    print(f"Remaining to process: {len(remaining)}")
    print(f"Total images to generate: {len(remaining) * IMAGES_PER_CREATURE}\n")

    if not remaining:
        print("[COMPLETE] All creatures already have images!")
        return

    # Initialize ImageGenerator once
    generator = ImageGenerator()

    # Process each creature
    for idx, creature in enumerate(remaining, 1):
        creature_id = creature['creature_id']
        creature_name = creature['creature_name']
        prompt = creature['prompt']
        negative_prompt = creature['negative_prompt']

        print("="*80)
        print(f"[{idx}/{len(remaining)}] {creature_name}")
        print(f"ID: {creature_id}")
        print("="*80)
        print(f"Prompt: {prompt[:100]}...")
        print()

        generated_files = []

        # Generate 9 images
        for i in range(1, IMAGES_PER_CREATURE + 1):
            try:
                print(f"  [{i}/{IMAGES_PER_CREATURE}] Generating image {i}...", end=' ', flush=True)

                start_time = time.time()
                image_data = await generate_image(generator, prompt, negative_prompt)
                elapsed = time.time() - start_time

                # Save image
                filename = f"{creature_id}_{i}.png"
                filepath = OUTPUT_DIR / filename

                with open(filepath, 'wb') as f:
                    f.write(image_data)

                file_size = len(image_data)
                print(f"[OK] {elapsed:.1f}s ({file_size:,} bytes)")

                generated_files.append(filename)

                # Small delay to be nice to the service
                await asyncio.sleep(1)

            except Exception as e:
                print(f"[ERROR] {e}")

        # Track completion
        if generated_files:
            # Ensure tracking file exists with headers
            if not TRACKING_FILE.exists():
                with open(TRACKING_FILE, 'w', newline='', encoding='utf-8') as f:
                    writer = csv.writer(f)
                    writer.writerow(['creature_id', 'filename'])

            with open(TRACKING_FILE, 'a', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                for filename in generated_files:
                    writer.writerow([creature_id, filename])

            print(f"\n[SUCCESS] Generated {len(generated_files)}/{IMAGES_PER_CREATURE} images")
            print(f"Saved to: {OUTPUT_DIR}")
        else:
            print(f"\n[FAILED] Could not generate any images")

        print()

    print("="*80)
    print("[COMPLETE] Batch generation finished!")
    print("="*80)

if __name__ == '__main__':
    print("\n" + "="*80)
    print("Chatlings Batch Image Generation - Perchance AI")
    print("Free & Unlimited - No API Key Required")
    print(f"Generating {IMAGES_PER_CREATURE} images per creature")
    print("="*80 + "\n")

    try:
        asyncio.run(process_queue())
    except KeyboardInterrupt:
        print("\n\n[STOPPED] Batch generation interrupted by user")
        print("Progress has been saved. Run again to continue.\n")
    except Exception as e:
        print(f"\n[ERROR] {e}\n")
