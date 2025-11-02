#!/usr/bin/env python3
"""
Generate detailed AI image prompts for Chatlings creatures
For use with Kaiber, Midjourney, Stable Diffusion, etc.
"""

import psycopg2
import json
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv(Path(__file__).parent.parent.parent / '.env')

# Database connection
conn = psycopg2.connect(
    host=os.getenv('DB_HOST', 'localhost'),
    port=int(os.getenv('DB_PORT', 5432)),
    database=os.getenv('DB_NAME', 'chatlings'),
    user=os.getenv('DB_USER', 'postgres'),
    password=os.getenv('DB_PASSWORD')
)

def generate_image_prompt(creature):
    """Generate detailed prompt for AI image generation"""
    subspecies = creature['subspecies_name']
    colouring = creature['colouring_name']
    style = creature['style_name']
    mood = creature['mood_name']
    motion = creature['motion_name']
    element = creature['elemental_affinity']
    environment = creature['environment_name']
    rarity = creature['rarity_tier']

    # Build the main prompt
    prompt_parts = []

    # Start with creature type and mood
    prompt_parts.append(f"A {mood.lower()} {subspecies.lower()}")

    # Add style description
    style_descriptions = {
        'Naturalistic': 'rendered in a realistic, natural style with organic textures',
        'Gothic': 'with dark gothic aesthetics, ornate details, and dramatic shadows',
        'Regal': 'with royal, majestic appearance and elegant proportions',
        'Majestic': 'grand and imposing with dignified presence',
        'Sleek': 'with smooth, streamlined forms and polished surfaces',
        'Ornate': 'decorated with intricate patterns and elaborate details',
        'Minimalist': 'with clean, simple lines and refined composition',
        'Cosmic': 'with celestial, space-themed aesthetics and starry elements',
        'Ethereal': 'translucent and otherworldly with mystical glow',
        'Cyberpunk': 'with neon-lit technological details and futuristic elements',
        'Geometric': 'composed of angular, geometric shapes and patterns',
    }
    prompt_parts.append(style_descriptions.get(style, f'in {style.lower()} style'))

    # Add color scheme
    color_parts = colouring.lower().split('&')
    if len(color_parts) == 2:
        prompt_parts.append(f"featuring {color_parts[0].strip()} and {color_parts[1].strip()} colors")
    else:
        prompt_parts.append(f"with {colouring.lower()} coloring")

    # Add motion/pose
    motion_descriptions = {
        'Roaring stance': 'in an aggressive roaring pose with mouth open',
        'Slow prowl': 'moving in a cautious stalking motion',
        'Wing beat + roar': 'with wings spread wide mid-flight, roaring',
        'Spiral drift': 'floating in a graceful spiral motion',
        'Glitch loop': 'with digital glitch effects and pixelated distortions',
        'Data pulse': 'pulsing with streams of data and code',
        'Flame dance': 'surrounded by dancing flames and fire particles',
        'Lightning dash': 'crackling with lightning energy',
        'Orbit shimmer': 'with orbital rings of light around it',
        'Phase flicker': 'partially phased between dimensions with shimmer effect',
    }
    motion_desc = motion_descriptions.get(motion, f'{motion.lower()}')
    prompt_parts.append(motion_desc)

    # Add elemental effects
    element_effects = {
        'Fire': 'with fire particles and ember effects',
        'Water': 'with water droplets and flowing liquid effects',
        'Shadow': 'emanating dark shadow tendrils',
        'Light': 'radiating brilliant light rays',
        'Lightning': 'crackling with electric bolts',
        'Ice': 'with frost crystals and icy mist',
        'Nature': 'with leaves and natural growth elements',
        'Code': 'with floating code snippets and binary streams',
        'Time': 'with clock gears and temporal distortion effects',
        'Space': 'with stars and cosmic dust particles',
        'Void': 'with dark void rifts and gravity distortion',
    }
    if element in element_effects:
        prompt_parts.append(element_effects[element])

    # Add environment/background
    env_descriptions = {
        'Savannah': 'set in golden savannah grasslands at sunset',
        'Cyberspace': 'in a digital cyberspace environment with neon grids',
        'Volcano': 'near an active volcano with lava flows',
        'Nebula': 'floating in a colorful space nebula',
        'Temple': 'inside an ancient mystical temple',
        'Deep sea': 'in the dark depths of the ocean',
        'Sky': 'high in the clouds',
        'Cave': 'in a dark atmospheric cave',
        'Ruins': 'among ancient crumbling ruins',
    }
    env_desc = env_descriptions.get(environment, f'in {environment.lower()}')
    prompt_parts.append(env_desc)

    # Add quality and style tags based on rarity
    quality_tags = {
        'Legendary': 'masterpiece, highly detailed, 8k, dramatic lighting, cinematic composition',
        'Epic': 'high quality, detailed, dramatic lighting, dynamic composition',
        'Rare': 'detailed, good lighting, professional',
        'Uncommon': 'detailed, well-lit',
        'Common': 'clean, clear'
    }
    prompt_parts.append(quality_tags.get(rarity, 'high quality'))

    # Combine into full prompt
    full_prompt = ', '.join(prompt_parts)

    # Generate negative prompt (things to avoid)
    negative_prompt = "blurry, low quality, distorted, disfigured, ugly, bad anatomy, watermark, signature, text, human, person, realistic photo"

    # Style tags for categorization
    style_tags = f"{style}, {mood}, {element}, {rarity}"

    return {
        'prompt': full_prompt,
        'negative_prompt': negative_prompt,
        'style_tags': style_tags
    }

# Get 10 random creatures
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
    WHERE c.creature_shortname IS NOT NULL
    ORDER BY RANDOM()
    LIMIT 10
""")

creatures = []
for row in cursor.fetchall():
    creatures.append({
        'id': str(row[0]),
        'creature_name': row[1],
        'creature_shortname': row[2],
        'rarity_tier': row[3],
        'subspecies_name': row[4],
        'colouring_name': row[5],
        'style_name': row[6],
        'mood_name': row[7],
        'motion_name': row[8],
        'elemental_affinity': row[9],
        'environment_name': row[10]
    })

print(f"\n{'='*80}")
print(f"Generating AI Image Prompts for 10 Random Creatures")
print(f"{'='*80}\n")

results = []
for i, creature in enumerate(creatures, 1):
    prompt_data = generate_image_prompt(creature)

    result = {
        'creature_id': creature['id'],
        'creature_name': creature['creature_name'],
        'creature_shortname': creature['creature_shortname'],
        'rarity': creature['rarity_tier'],
        'prompt': prompt_data['prompt'],
        'negative_prompt': prompt_data['negative_prompt'],
        'style_tags': prompt_data['style_tags']
    }

    results.append(result)

    # Display
    print(f"{i}. {creature['creature_name']} ({creature['creature_shortname']})")
    print(f"   Rarity: {creature['rarity_tier']}")
    print(f"\n   PROMPT:")
    print(f"   {prompt_data['prompt']}")
    print(f"\n   NEGATIVE PROMPT:")
    print(f"   {prompt_data['negative_prompt']}")
    print(f"\n   STYLE TAGS: {prompt_data['style_tags']}")
    print(f"\n{'-'*80}\n")

# Save to JSON
import os
output_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'sample_image_prompts.json')
with open(output_path, 'w') as f:
    json.dump(results, f, indent=2)

print(f"\n✓ Generated prompts for {len(results)} creatures")
print(f"✓ Saved to: {output_path}\n")

# Insert into database
print("Inserting into database...")
for result in results:
    cursor.execute("""
        INSERT INTO creature_image_prompts (creature_id, prompt_text, negative_prompt, style_tags)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (creature_id) DO UPDATE
        SET prompt_text = EXCLUDED.prompt_text,
            negative_prompt = EXCLUDED.negative_prompt,
            style_tags = EXCLUDED.style_tags,
            updated_at = CURRENT_TIMESTAMP
    """, (result['creature_id'], result['prompt'], result['negative_prompt'], result['style_tags']))

conn.commit()
print(f"✓ Inserted {len(results)} prompts into database\n")

print(f"{'='*80}")
print("Complete!")
print(f"{'='*80}\n")
print("You can now:")
print("1. Review the prompts in data/sample_image_prompts.json")
print("2. Query creature_image_prompts table in the database")
print("3. Test these prompts with Kaiber or your chosen AI image generator\n")

cursor.close()
conn.close()
