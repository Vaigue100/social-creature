#!/usr/bin/env python3
"""
Chatlings Creature Art Generation Service
Generates 9 images per creature using Perchance AI
"""

import asyncio
import psycopg2
import os
from pathlib import Path
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv(Path(__file__).parent.parent.parent / '.env')

# Check if perchance is installed
try:
    from perchance import ImageGenerator
except ImportError:
    print("ERROR: Perchance package not installed!")
    print("Please install with: pip install perchance")
    sys.exit(1)

# Database connection from environment variables
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', 5432)),
    'database': os.getenv('DB_NAME', 'chatlings'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD')
}

# Art style
ART_STYLE = "Cute Figurine"

# Number of images to generate per creature
IMAGES_PER_CREATURE = 9

def get_random_creature_without_art():
    """Get a random creature that doesn't have artwork yet"""
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            c.id,
            c.creature_name,
            c.creature_shortname,
            c.rarity_tier,
            dss.subspecies_name,
            dc.colouring_name,
            dst.style_name,
            dm.mood_name,
            dmt.motion_name,
            dea.affinity_name as elemental_affinity,
            de.environment_name
        FROM creatures c
        JOIN dim_subspecies dss ON c.subspecies_id = dss.id
        JOIN dim_colouring dc ON c.colouring_id = dc.id
        JOIN dim_style dst ON c.style_id = dst.id
        JOIN dim_mood dm ON c.mood_id = dm.id
        JOIN dim_motion_type dmt ON c.motion_type_id = dmt.id
        JOIN dim_elemental_affinity dea ON c.elemental_affinity_id = dea.id
        JOIN dim_environment de ON c.environment_id = de.id
        LEFT JOIN creature_artwork ca ON c.id = ca.creature_id
        WHERE ca.id IS NULL
        ORDER BY RANDOM()
        LIMIT 1
    """)

    result = cursor.fetchone()
    cursor.close()
    conn.close()

    if result:
        return {
            'id': str(result[0]),
            'creature_name': result[1],
            'creature_shortname': result[2],
            'rarity_tier': result[3],
            'subspecies_name': result[4],
            'colouring_name': result[5],
            'style_name': result[6],
            'mood_name': result[7],
            'motion_name': result[8],
            'elemental_affinity': result[9],
            'environment_name': result[10]
        }
    return None

def generate_prompt(creature):
    """Generate the full prompt for image generation"""
    subspecies = creature['subspecies_name']
    colouring = creature['colouring_name']
    style = creature['style_name']
    mood = creature['mood_name']
    motion = creature['motion_name']
    element = creature['elemental_affinity']
    environment = creature['environment_name']
    rarity = creature['rarity_tier']

    prompt_parts = []

    # Art style first
    prompt_parts.append(f"{ART_STYLE} style")

    # Start with creature type and mood
    prompt_parts.append(f"a {mood.lower()} {subspecies.lower()}")

    # Add style description
    style_descriptions = {
        'Naturalistic': 'with realistic natural details',
        'Gothic': 'with dark gothic aesthetic and ornate details',
        'Regal': 'with royal majestic appearance',
        'Majestic': 'grand and dignified',
        'Sleek': 'with smooth streamlined form',
        'Ornate': 'decorated with intricate patterns',
        'Minimalist': 'with clean simple design',
        'Cosmic': 'with celestial space theme',
        'Ethereal': 'translucent and mystical',
        'Cyberpunk': 'with neon technological details',
        'Geometric': 'with angular geometric shapes',
    }
    if style in style_descriptions:
        prompt_parts.append(style_descriptions[style])

    # Add colors
    color_parts = colouring.lower().split('&')
    if len(color_parts) == 2:
        prompt_parts.append(f"{color_parts[0].strip()} and {color_parts[1].strip()} colors")
    else:
        prompt_parts.append(f"{colouring.lower()} coloring")

    # Add pose/motion (simplified for figurines)
    motion_simplified = {
        'Roaring stance': 'in roaring pose',
        'Slow prowl': 'in stalking pose',
        'Wing beat + roar': 'with wings spread',
        'Spiral drift': 'in floating pose',
        'Glitch loop': 'with digital effects',
        'Data pulse': 'with tech elements',
    }
    motion_desc = motion_simplified.get(motion, 'in dynamic pose')
    prompt_parts.append(motion_desc)

    # Add elemental effects (subtle for figurines)
    element_effects = {
        'Fire': 'with fire accents',
        'Water': 'with water elements',
        'Shadow': 'with shadow effects',
        'Light': 'with glowing elements',
        'Lightning': 'with electric details',
        'Ice': 'with frost details',
        'Nature': 'with plant elements',
        'Code': 'with digital patterns',
        'Magic': 'with magical runes',
    }
    if element in element_effects:
        prompt_parts.append(element_effects[element])

    # Quality tags based on rarity
    quality_tags = {
        'Legendary': 'highly detailed, premium quality, perfect lighting',
        'Epic': 'very detailed, high quality, great lighting',
        'Rare': 'detailed, good quality',
        'Uncommon': 'well-made, clear',
        'Common': 'clean, cute'
    }
    prompt_parts.append(quality_tags.get(rarity, 'good quality'))

    # Combine
    full_prompt = ', '.join(prompt_parts)

    return full_prompt

def generate_negative_prompt():
    """Generate negative prompt (things to avoid)"""
    return "blurry, low quality, distorted, ugly, bad anatomy, text, watermark, realistic photo, scary, creepy, horror"

async def generate_images_for_creature(creature, output_dir):
    """Generate 9 images for the creature"""

    print(f"\n{'='*80}")
    print(f"Generating artwork for: {creature['creature_name']}")
    print(f"Shortname: {creature['creature_shortname']}")
    print(f"ID: {creature['id']}")
    print(f"{'='*80}\n")

    # Generate prompts
    prompt = generate_prompt(creature)
    negative_prompt = generate_negative_prompt()

    print(f"PROMPT: {prompt}\n")
    print(f"NEGATIVE: {negative_prompt}\n")
    print(f"ART STYLE: {ART_STYLE}\n")

    # Initialize ImageGenerator
    generator = ImageGenerator()

    generated_files = []
    creature_id = creature['id']

    print(f"Generating {IMAGES_PER_CREATURE} images...\n")

    for i in range(1, IMAGES_PER_CREATURE + 1):
        try:
            print(f"  [{i}/{IMAGES_PER_CREATURE}] Generating image {i}...")

            # Generate image
            image_data = await generator.image(
                prompt=prompt,
                negative_prompt=negative_prompt
            )

            # Save image
            filename = f"{creature_id}_{i}.png"
            filepath = os.path.join(output_dir, filename)

            # Save the image data to file
            with open(filepath, 'wb') as f:
                f.write(image_data)

            file_size = os.path.getsize(filepath)

            print(f"      [OK] Saved: {filename} ({file_size:,} bytes)")

            generated_files.append({
                'filename': filename,
                'filepath': filepath,
                'image_number': i,
                'file_size': file_size
            })

        except Exception as e:
            print(f"      [ERROR] Failed to generate image {i}: {e}")

    print(f"\n[SUCCESS] Generated {len(generated_files)}/{IMAGES_PER_CREATURE} images successfully\n")

    return generated_files, prompt, negative_prompt

def save_artwork_to_database(creature_id, generated_files, prompt, negative_prompt):
    """Save artwork records to database"""
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()

    for file_info in generated_files:
        cursor.execute("""
            INSERT INTO creature_artwork
                (creature_id, image_filename, image_number, file_path, file_size_bytes,
                 generation_prompt, negative_prompt, art_style)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            creature_id,
            file_info['filename'],
            file_info['image_number'],
            file_info['filepath'],
            file_info['file_size'],
            prompt,
            negative_prompt,
            ART_STYLE
        ))

    conn.commit()
    cursor.close()
    conn.close()

    print(f"[SUCCESS] Saved {len(generated_files)} artwork records to database\n")

async def main():
    """Main function"""

    print("\n" + "="*80)
    print("Chatlings Creature Art Generation Service")
    print("="*80 + "\n")

    # Get output directory
    script_dir = Path(__file__).parent.parent
    output_dir = script_dir / 'artwork'
    output_dir.mkdir(exist_ok=True)

    print(f"Output directory: {output_dir}\n")

    # Get a random creature without art
    print("Finding creature without artwork...")
    creature = get_random_creature_without_art()

    if not creature:
        print("\n[SUCCESS] All creatures have artwork! Nothing to generate.\n")
        return

    # Generate images
    generated_files, prompt, negative_prompt = await generate_images_for_creature(
        creature,
        str(output_dir)
    )

    if generated_files:
        # Save to database
        save_artwork_to_database(
            creature['id'],
            generated_files,
            prompt,
            negative_prompt
        )

        print("="*80)
        print(f"[COMPLETE] Generated {len(generated_files)} images for:")
        print(f"  {creature['creature_name']} ({creature['creature_shortname']})")
        print("="*80 + "\n")
    else:
        print("\n[ERROR] Failed to generate any images\n")

if __name__ == '__main__':
    asyncio.run(main())
