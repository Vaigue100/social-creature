#!/usr/bin/env python3
"""
Improved Chatlings Shortname Generator
Creates blended, phonetically pleasing shortnames like:
- Crifallagra (not AggressiveGlitchCreature)
- Reseneurfi (not ProudNeuralNetwork)
- Duenjosalt (not GooglyEyedGremlin)
"""

import psycopg2
import json
import re
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

# Translation dictionary - more comprehensive
translations = {
    # Moods
    'aggressive': {'es': 'agresivo', 'it': 'aggressivo', 'fr': 'agressif', 'de': 'aggressiv', 'la': 'ferox'},
    'proud': {'es': 'orgulloso', 'it': 'fiero', 'fr': 'fier', 'la': 'superbus'},
    'wise': {'la': 'sapiens', 'el': 'sophos', 'it': 'saggio', 'es': 'sabio'},
    'calm': {'la': 'tranquillus', 'it': 'calmo', 'es': 'tranquilo'},
    'fierce': {'la': 'ferox', 'es': 'feroz', 'it': 'feroce'},
    'noble': {'la': 'nobilis', 'es': 'noble', 'it': 'nobile'},
    'mysterious': {'la': 'mysticus', 'es': 'misterioso', 'it': 'misterioso'},
    'playful': {'es': 'jugueton', 'it': 'giocoso', 'fr': 'joueur'},
    'wild': {'la': 'ferus', 'es': 'salvaje', 'it': 'selvaggio'},
    'gentle': {'la': 'mitis', 'es': 'gentil', 'it': 'gentile'},

    # Colors
    'gold': {'la': 'aurum', 'es': 'oro', 'it': 'oro'},
    'silver': {'la': 'argentum', 'es': 'plata', 'it': 'argento'},
    'black': {'la': 'niger', 'es': 'negro', 'it': 'nero'},
    'white': {'la': 'albus', 'es': 'blanco', 'it': 'bianco'},
    'red': {'la': 'ruber', 'es': 'rojo', 'it': 'rosso'},
    'crimson': {'la': 'coccineus', 'es': 'carmesi', 'it': 'cremisi'},
    'bronze': {'la': 'aes', 'es': 'bronce', 'it': 'bronzo'},

    # Creature types
    'dragon': {'la': 'draco', 'es': 'dragon', 'it': 'drago', 'cy': 'draig'},
    'glitch': {'es': 'falla', 'it': 'glitch', 'fr': 'anomalie'},
    'creature': {'la': 'creatura', 'es': 'criatura', 'it': 'creatura'},
    'neural': {'es': 'neural', 'it': 'neurale', 'fr': 'neural'},
    'network': {'es': 'red', 'it': 'rete', 'fr': 'reseau'},
    'pixel': {'es': 'pixel', 'it': 'pixel', 'fr': 'pixel'},
    'pet': {'es': 'mascota', 'pt': 'bicho', 'it': 'animale'},
    'blob': {'es': 'masa', 'nl': 'slimklod', 'it': 'blob'},
    'goo': {'es': 'baba', 'nl': 'slim', 'it': 'melma'},
    'gremlin': {'es': 'duende', 'it': 'folletto', 'fr': 'lutin'},
    'googly': {'es': 'saltones', 'it': 'sporgenti', 'pt': 'arregalados'},
    'eyed': {'es': 'ojos', 'it': 'occhi', 'pt': 'olhos'},
}

def extract_syllables(word, max_syllables=2):
    """Extract key syllables from a word"""
    word = word.lower()
    # Get first 2-4 characters and last 2-3 characters
    if len(word) <= 4:
        return word
    elif len(word) <= 7:
        return word[:3] + word[-2:]
    else:
        return word[:3] + word[-3:]

def translate_word(word, language='es'):
    """Translate a word to target language"""
    word_clean = word.lower().strip()
    word_clean = re.sub(r'[^a-z]', '', word_clean)

    if word_clean in translations and language in translations[word_clean]:
        return translations[word_clean][language]
    return word_clean

def blend_syllables(parts, max_length=13):
    """Blend syllables intelligently"""
    if len(parts) == 1:
        return parts[0][:max_length]

    # Take meaningful parts from each word
    result = ""
    for i, part in enumerate(parts):
        if i == 0:
            # First word: take 3-5 chars
            result += part[:min(5, len(part))]
        elif i == len(parts) - 1:
            # Last word: take 3-4 chars
            result += part[-min(4, len(part)):]
        else:
            # Middle words: take 2-3 chars
            result += part[:min(3, len(part))]

    # Trim to max length
    result = result[:max_length]

    # Clean up consonant clusters that are hard to pronounce
    result = re.sub(r'([bcdfghjklmnpqrstvwxyz]){4,}', lambda m: m.group(0)[:3], result)

    return result

def choose_language(species, subspecies, mood):
    """Choose best language for the creature type"""
    species_lower = species.lower()
    subspecies_lower = subspecies.lower()

    # Tech/Digital -> Spanish, German, or Italian
    if any(x in species_lower + subspecies_lower for x in ['glitch', 'ai', 'cyber', 'digital', 'code', 'neural', 'network']):
        return random.choice(['es', 'de', 'it'])

    # Mythical -> Latin or Greek
    elif any(x in species_lower + subspecies_lower for x in ['dragon', 'phoenix', 'chimera', 'basilisk']):
        return random.choice(['la', 'el'])

    # Cartoon/Playful -> Spanish, Italian, Dutch
    elif any(x in species_lower + subspecies_lower for x in ['blob', 'goo', 'pixel', 'gremlin', 'cube']):
        return random.choice(['es', 'it', 'nl', 'pt'])

    # Cosmic -> Greek or Latin
    elif any(x in species_lower + subspecies_lower for x in ['cosmic', 'nebula', 'time', 'space', 'gravity']):
        return random.choice(['el', 'la'])

    # Default: mix it up
    else:
        return random.choice(['la', 'es', 'it', 'fr'])

def generate_shortname(creature_name, species, subspecies, mood):
    """Generate a good shortname like the examples"""

    # Parse the creature name
    words = creature_name.lower().split()
    words = [w for w in words if w not in ['the', 'of', 'a', 'an']]

    # Choose language
    lang = choose_language(species, subspecies, mood)

    # Translate key words
    translated = []
    for word in words:
        word_clean = re.sub(r'[^a-z]', '', word)
        trans = translate_word(word_clean, lang)
        if trans:
            translated.append(trans)

    # If no translations, use original words
    if not translated:
        translated = [re.sub(r'[^a-z]', '', w) for w in words]

    # Blend the syllables
    shortname = blend_syllables(translated, max_length=13)

    # Capitalize first letter only
    shortname = shortname.capitalize()

    # Map language codes to names
    lang_names = {
        'es': 'Spanish',
        'it': 'Italian',
        'fr': 'French',
        'la': 'Latin',
        'el': 'Greek',
        'de': 'German',
        'nl': 'Dutch',
        'pt': 'Portuguese',
        'cy': 'Welsh'
    }

    return shortname, lang_names.get(lang, lang)

def generate_pronunciation(shortname):
    """Generate simple pronunciation guide"""
    # Split into syllables (roughly)
    syllables = []
    current = ""
    vowels = "aeiou"

    for i, char in enumerate(shortname.lower()):
        current += char
        # Break on vowel followed by consonant
        if char in vowels and i < len(shortname) - 1 and shortname[i+1].lower() not in vowels:
            if len(current) >= 2:
                syllables.append(current)
                current = ""

    if current:
        syllables.append(current)

    if len(syllables) == 0:
        syllables = [shortname.lower()]

    # Capitalize stressed syllable (usually first or second)
    if len(syllables) > 1:
        stress_idx = 0 if len(syllables) == 2 else 1
        syllables[stress_idx] = syllables[stress_idx].upper()

    return '-'.join(syllables)

def generate_vibe(mood, species):
    """Generate vibe description"""
    vibe_map = {
        'aggressive': ['Fierce', 'Brutal', 'Combative', 'Hostile'],
        'proud': ['Regal', 'Majestic', 'Noble', 'Stately'],
        'wise': ['Sage', 'Ancient', 'Enlightened'],
        'calm': ['Serene', 'Tranquil', 'Peaceful'],
        'fierce': ['Savage', 'Wild', 'Ferocious'],
        'playful': ['Whimsical', 'Fun', 'Bouncy'],
        'mysterious': ['Cryptic', 'Enigmatic', 'Shadowy'],
    }

    mood_lower = mood.lower()
    vibe_options = vibe_map.get(mood_lower, ['Unique', 'Mysterious'])
    vibe = random.choice(vibe_options)

    # Add prefix for tech/digital
    if any(x in species.lower() for x in ['glitch', 'ai', 'cyber', 'digital']):
        vibe = f'Digital-{vibe.lower()}'

    return vibe

# Get all creatures
cursor = conn.cursor()
cursor.execute("""
    SELECT
        c.id,
        c.creature_name,
        c.rarity_tier,
        ds.species_name,
        dss.subspecies_name,
        dm.mood_name
    FROM creatures c
    JOIN dim_species ds ON c.species_id = ds.id
    JOIN dim_subspecies dss ON c.subspecies_id = dss.id
    JOIN dim_mood dm ON c.mood_id = dm.id
    ORDER BY c.creature_name
""")

creatures = cursor.fetchall()
print(f"\n{'='*60}")
print(f"Generating Improved Shortnames")
print(f"{'='*60}\n")
print(f"Found {len(creatures)} creatures\n")

results = []
for i, (id, name, rarity, species, subspecies, mood) in enumerate(creatures):
    shortname, language = generate_shortname(name, species, subspecies, mood)
    pronunciation = generate_pronunciation(shortname)
    vibe = generate_vibe(mood, species)

    results.append({
        'id': str(id),
        'shortname': shortname,
        'language': language,
        'pronunciation': pronunciation,
        'vibe': vibe
    })

    # Show first 20 as examples
    if i < 20:
        print(f"{name}")
        print(f"  → {shortname} ({language})")
        print(f"  → [{pronunciation}] - {vibe}\n")

    if (i + 1) % 100 == 0:
        print(f"Progress: {i+1}/{len(creatures)} creatures...")

# Save to file
import os
output_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'creature_shortnames_improved.json')
with open(output_path, 'w') as f:
    json.dump(results, f, indent=2)

print(f"\n✓ Generated {len(results)} shortnames")
print(f"✓ Saved to: {output_path}\n")

# Show preview
print(f"{'='*60}")
print("Preview of improved shortnames:")
print(f"{'='*60}\n")

for result in results[:25]:
    print(f"{result['shortname']:<20} | {result['language']:<12} | {result['pronunciation']:<25} | {result['vibe']}")

print(f"\n{'='*60}")
print("Generation complete!")
print(f"{'='*60}\n")
print("Next: Review the output, then run update-shortnames.js to update database\n")

cursor.close()
conn.close()
