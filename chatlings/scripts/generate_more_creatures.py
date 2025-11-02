#!/usr/bin/env python3
"""
Generate many more creatures using expanded options
Creates thousands of new creature combinations
"""

import psycopg2
import uuid
import random
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

cursor = conn.cursor()

# Get all dimension options
cursor.execute("SELECT id FROM dim_subspecies")
subspecies_ids = [row[0] for row in cursor.fetchall()]

cursor.execute("SELECT id FROM dim_colouring")
colouring_ids = [row[0] for row in cursor.fetchall()]

cursor.execute("SELECT id FROM dim_style")
style_ids = [row[0] for row in cursor.fetchall()]

cursor.execute("SELECT id FROM dim_mood")
mood_ids = [row[0] for row in cursor.fetchall()]

cursor.execute("SELECT id FROM dim_motion_type")
motion_ids = [row[0] for row in cursor.fetchall()]

cursor.execute("SELECT id FROM dim_elemental_affinity")
element_ids = [row[0] for row in cursor.fetchall()]

cursor.execute("SELECT id FROM dim_environment")
environment_ids = [row[0] for row in cursor.fetchall()]

print(f"Generating creatures from:")
print(f"  {len(subspecies_ids)} subspecies")
print(f"  {len(colouring_ids)} colors")
print(f"  {len(style_ids)} styles")
print(f"  {len(mood_ids)} moods")
print(f"  {len(motion_ids)} motions")
print(f"  {len(element_ids)} elements")
print(f"  {len(environment_ids)} environments")
print()

# Generate 5000 random creatures
target = 5000
created = 0
attempts = 0
max_attempts = 10000

print(f"Generating {target} new creatures...")

while created < target and attempts < max_attempts:
    attempts += 1

    # Random combination
    combo = {
        'subspecies_id': random.choice(subspecies_ids),
        'colouring_id': random.choice(colouring_ids),
        'style_id': random.choice(style_ids),
        'mood_id': random.choice(mood_ids),
        'motion_type_id': random.choice(motion_ids),
        'elemental_affinity_id': random.choice(element_ids),
        'environment_id': random.choice(environment_ids)
    }

    try:
        # Check if combination already exists
        cursor.execute("""
            SELECT id FROM creatures
            WHERE subspecies_id = %s
            AND colouring_id = %s
            AND style_id = %s
            AND mood_id = %s
            AND motion_type_id = %s
            AND elemental_affinity_id = %s
            AND environment_id = %s
        """, tuple(combo.values()))

        if cursor.fetchone():
            continue  # Skip duplicates
    except:
        conn.rollback()
        continue

    # Get names for creature
    try:
        cursor.execute("""
            SELECT
                dss.subspecies_name,
                dc.colouring_name,
                dst.style_name,
                dm.mood_name
            FROM dim_subspecies dss, dim_colouring dc, dim_style dst, dim_mood dm
            WHERE dss.id = %s AND dc.id = %s AND dst.id = %s AND dm.id = %s
        """, (combo['subspecies_id'], combo['colouring_id'], combo['style_id'], combo['mood_id']))

        names = cursor.fetchone()
        creature_name = f"{names[3]} {names[1].split(' & ')[0]} {names[0]}"  # e.g., "Playful Purple Robot"
    except:
        conn.rollback()
        continue

    # Insert creature
    try:
        cursor.execute("""
            INSERT INTO creatures (
                id, creature_name, creature_shortname, category, species_id,
                subspecies_id, colouring_id, style_id, mood_id, motion_type_id,
                elemental_affinity_id, environment_id, rarity_tier
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            str(uuid.uuid4()),
            creature_name,
            creature_name[:12].replace(' ', ''),  # Temporary shortname
            'Generated',
            subspecies_ids[0],  # Default species
            combo['subspecies_id'],
            combo['colouring_id'],
            combo['style_id'],
            combo['mood_id'],
            combo['motion_type_id'],
            combo['elemental_affinity_id'],
            combo['environment_id'],
            random.choice(['Common', 'Common', 'Common', 'Uncommon', 'Uncommon', 'Rare', 'Epic', 'Legendary'])
        ))

        created += 1

        if created % 100 == 0:
            print(f"  Created {created}/{target}...")
            conn.commit()

    except Exception as e:
        conn.rollback()  # Rollback failed transaction
        continue  # Skip errors

conn.commit()
cursor.close()
conn.close()

print(f"\n[SUCCESS] Created {created} new creatures!")
print(f"Total attempts: {attempts}")
