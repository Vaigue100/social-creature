#!/usr/bin/env python3
"""
Batch Generate Creature Images using Stable Diffusion WebUI
Reads from creature_prompts_queue.csv and generates 9 images per creature
Uses local Stable Diffusion API (RTX 4070)
"""

import csv
import requests
import json
import base64
import os
from pathlib import Path
import time

# Configuration
SD_API_URL = "http://localhost:7860"
QUEUE_FILE = Path(__file__).parent.parent / 'artwork' / 'creature_prompts_queue.csv'
OUTPUT_DIR = Path(__file__).parent.parent / 'artwork'
TRACKING_FILE = OUTPUT_DIR / 'creature_images_created.csv'
IMAGES_PER_CREATURE = 9

# Stable Diffusion settings (optimized for RTX 4070)
SD_SETTINGS = {
    "steps": 35,  # Slightly more steps for better quality
    "sampler_name": "DPM++ SDE Karras",  # Better quality for creatures
    "cfg_scale": 7,
    "width": 512,
    "height": 512,
    "batch_size": 1,
    "n_iter": 1,
    "seed": -1,  # Random seed each time
}

def check_sd_api():
    """Check if Stable Diffusion API is available"""
    try:
        response = requests.get(f"{SD_API_URL}/sdapi/v1/sd-models")
        if response.status_code == 200:
            print("[OK] Stable Diffusion API is running")
            return True
    except:
        pass
    print("[ERROR] Stable Diffusion API not available!")
    print("Make sure WebUI is running with --api flag")
    print("Start with: webui-user.bat")
    return False

def load_completed_creatures():
    """Load list of already completed creatures"""
    completed = set()
    if TRACKING_FILE.exists():
        with open(TRACKING_FILE, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                completed.add(row['creature_id'])
    return completed

def generate_image(prompt, negative_prompt):
    """Generate one image using Stable Diffusion API"""
    payload = {
        "prompt": prompt,
        "negative_prompt": negative_prompt,
        **SD_SETTINGS
    }

    response = requests.post(f"{SD_API_URL}/sdapi/v1/txt2img", json=payload)

    if response.status_code == 200:
        r = response.json()
        # Return first image from batch
        return base64.b64decode(r['images'][0])
    else:
        raise Exception(f"API Error: {response.status_code}")

def process_queue():
    """Process the creature queue and generate images"""

    if not check_sd_api():
        return

    OUTPUT_DIR.mkdir(exist_ok=True)

    # Load completed creatures
    completed = load_completed_creatures()
    print(f"Already completed: {len(completed)} creatures\n")

    # Read queue
    with open(QUEUE_FILE, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        creatures = list(reader)

    total_creatures = len(creatures)
    remaining = [c for c in creatures if c['creature_id'] not in completed]

    print(f"Total creatures: {total_creatures}")
    print(f"Remaining to process: {len(remaining)}")
    print(f"Total images to generate: {len(remaining) * IMAGES_PER_CREATURE}\n")

    if not remaining:
        print("[COMPLETE] All creatures already have images!")
        return

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
                image_data = generate_image(prompt, negative_prompt)
                elapsed = time.time() - start_time

                # Save image
                filename = f"{creature_id}_{i}.png"
                filepath = OUTPUT_DIR / filename

                with open(filepath, 'wb') as f:
                    f.write(image_data)

                file_size = len(image_data)
                print(f"[OK] {elapsed:.1f}s ({file_size:,} bytes)")

                generated_files.append(filename)

            except Exception as e:
                print(f"[ERROR] {e}")

        # Track completion
        if generated_files:
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
    print("Chatlings Batch Image Generation")
    print("Powered by Stable Diffusion + RTX 4070")
    print("="*80 + "\n")

    try:
        process_queue()
    except KeyboardInterrupt:
        print("\n\n[STOPPED] Batch generation interrupted by user")
        print("Progress has been saved. Run again to continue.\n")
    except Exception as e:
        print(f"\n[ERROR] {e}\n")
