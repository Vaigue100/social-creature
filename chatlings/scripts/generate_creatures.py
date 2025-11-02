#!/usr/bin/env python3
"""
Chatlings Creature Generator
Generates all creature combinations across species, subspecies, and dimensions
"""

import csv
import itertools
from pathlib import Path

# Define all dimensions
SPECIES_DATA = [
    # (category, species, subspecies_list)
    ("Real", "Mammal", ["Lion", "Elephant", "Fox", "Bat", "Wolf", "Bear", "Tiger", "Leopard"]),
    ("Real", "Avian", ["Owl", "Falcon", "Peacock", "Raven", "Eagle", "Hawk", "Parrot", "Hummingbird"]),
    ("Real", "Aquatic", ["Dolphin", "Jellyfish", "Octopus", "Seahorse", "Shark", "Whale", "Turtle", "Stingray"]),
    ("Real", "Insect", ["Butterfly", "Mantis", "Firefly", "Beetle", "Dragonfly", "Moth", "Bee", "Ant"]),

    ("Mythical", "Dragon", ["Fire Dragon", "Ice Dragon", "Storm Dragon", "Shadow Dragon", "Crystal Dragon", "Ancient Dragon"]),
    ("Mythical", "Phoenix", ["Flame Phoenix", "Frost Phoenix", "Thunder Phoenix", "Solar Phoenix"]),
    ("Mythical", "Celestial Beast", ["Unicorn", "Griffin", "Kitsune", "Qilin", "Pegasus"]),
    ("Mythical", "Serpent", ["Basilisk", "Hydra", "Leviathan", "Wyrm"]),
    ("Mythical", "Chimera", ["Lion Chimera", "Eagle Chimera", "Serpent Chimera"]),

    ("Cartoon", "Blob", ["Blob Critter", "Slime Blob", "Jelly Blob", "Goo Blob"]),
    ("Cartoon", "Geometric", ["Cube Beast", "Sphere Sprite", "Pyramid Pet", "Crystal Cube"]),
    ("Cartoon", "Stretchy", ["Stretchy Snake", "Elastic Cat", "Bendy Dog", "Flexy Fox"]),
    ("Cartoon", "Object", ["Talking Toaster", "Dancing Book", "Flying Chair", "Singing Lamp"]),
    ("Cartoon", "Abstract", ["Floating Head", "Googly-eyed Gremlin", "Pixel Pet", "Emoji Avatar"]),

    ("Synthetic", "AI Construct", ["Data Phantom", "Logic Beast", "Neural Network", "Algorithm Entity"]),
    ("Synthetic", "Glitch", ["Glitch Creature", "Corrupted Sprite", "Error Beast", "Bug Monster"]),
    ("Synthetic", "Cyber", ["Cyber Dragon", "Mecha Wolf", "Holo Tiger", "Digital Phoenix"]),
    ("Synthetic", "Code", ["Code Spider", "Data Worm", "Script Snake", "Binary Bug"]),

    ("Nature Spirit", "Tree", ["Treefolk", "Ancient Oak", "Willow Spirit", "Cherry Blossom"]),
    ("Nature Spirit", "Elemental Plant", ["Mossling", "Vineborn", "Thornling", "Petalbeast"]),
    ("Nature Spirit", "Weather", ["Cloud Sprite", "Thunder Cub", "Frost Wisp", "Storm Child"]),
    ("Nature Spirit", "Seasonal", ["Autumn Fox", "Spring Bloom", "Summer Blaze", "Winter Shade"]),

    ("Cosmic", "Nebula", ["Nebula Serpent", "Starcloud Dragon", "Galaxy Wyrm"]),
    ("Cosmic", "Gravity", ["Gravity Whale", "Void Leviathan", "Singularity Beast"]),
    ("Cosmic", "Time", ["Time Phantom", "Chrono Beast", "Temporal Shadow"]),
    ("Cosmic", "Space", ["Asteroid Turtle", "Comet Fox", "Meteor Wolf"]),

    ("Abstract", "Echo", ["Echo Orb", "Resonance Sprite", "Sound Beast"]),
    ("Abstract", "Fractal", ["Fractal Beast", "Pattern Creature", "Geometric Spirit"]),
    ("Abstract", "Dimension", ["Dimensional Shadow", "Rift Walker", "Phase Shifter"]),

    ("Elemental Mood", "Radiance", ["Light Radiance", "Golden Radiance", "Prismatic Radiance"]),
    ("Elemental Mood", "Pulse", ["Heart Pulse", "Energy Pulse", "Rhythm Pulse"]),
    ("Elemental Mood", "Echo", ["Pale Echo", "Mirror Echo", "Fading Echo"]),
    ("Elemental Mood", "Spectra", ["Rainbow Spectra", "Aurora Spectra", "Shifting Spectra"]),
    ("Elemental Mood", "Sigil", ["Ancient Sigil", "Rune Sigil", "Mystic Sigil"]),
]

COLOURINGS = [
    "Gold & brown", "Gold & flame", "Silver & gold", "Black & gold",
    "Bronze & amber", "White & gold", "Rust & brown", "Crimson & gold",
    "Grey & white", "Silver & aqua", "Slate & ivory", "Rust & cream",
    "Black & grey", "Rainbow shimmer", "Green & black", "Amber & neon green",
    "Neon pink & blue", "Crimson & ink", "Coral & gold", "Emerald & sapphire",
    "Black & violet", "Red & gold", "Orange & flame", "Pearl & pastel",
    "Tawny & silver", "White & crimson", "Olive & bronze", "Red & ember",
    "Teal & foam", "Brown & moss", "Pale blue & white", "Silver & indigo",
    "Pale blue & violet", "Bubblegum & mint", "Primary colors", "Lime & purple",
    "Chrome & red", "Blue & white matrix", "RGB flicker", "Black & neon green",
    "Grey & red", "Bark & leaf", "White & sky blue", "Grey & yellow",
    "Green & brown", "Magenta & cyan", "Black & silver", "Blue & yellow",
    "Transparent & violet", "Iridescent fractals", "Black & shifting grey",
    "Rainbow gradient", "Silver & obsidian"
]

STYLES = [
    "Naturalistic", "Gothic", "Regal", "Majestic", "Sleek", "Ornate",
    "Minimalist", "Cosmic", "Ethereal", "Delicate", "Angular", "Whimsical",
    "Noble", "Reptilian", "Flickering", "Flowing", "Chunky", "Wispy",
    "Dreamlike", "Radiant", "Squishy", "Blocky", "Elastic", "Retro",
    "Futuristic", "Fragmented", "Mecha", "Ancient", "Fluffy", "Stormy",
    "Soft", "Galactic", "Massive", "Cyberpunk", "Geometric", "Fluid",
    "Glowing", "Rhythmic", "Translucent", "Aura-based", "Rune-based"
]

MOODS = [
    "Proud", "Aggressive", "Wise", "Calm", "Fierce", "Noble", "Watchful",
    "Mysterious", "Dominant", "Playful", "Skittish", "Joyful", "Focused",
    "Excited", "Curious", "Clever", "Gentle", "Menacing", "Wild", "Elusive",
    "Stoic", "Melancholy", "Jubilant", "Silly", "Mischievous", "Goofy",
    "Chatty", "Neutral", "Chaotic", "Peaceful", "Dreamy", "Energetic",
    "Shy", "Enigmatic", "Angry", "Analytical", "Hopeful", "Intense",
    "Reflective", "Elated", "Calculating"
]

MOTION_TYPES = [
    "Roaring stance", "Slow prowl", "Dart & pause", "Pounce loop",
    "Mane shake", "Stalking motion", "Territorial stance", "Charging rush",
    "Head rotation", "Leaping arc", "Slow stomp", "Wing flutter",
    "Twitchy motion", "Blink & hover", "Pulse & drift", "Tentacle swirl",
    "Bobbing motion", "Dive motion", "Fan display", "Wing sweep",
    "Wing beat + roar", "Rising burst", "Gallop & glow", "Wing stretch",
    "Tail flick", "Coil & hiss", "Flame dance", "Ripple motion",
    "Ground rumble", "Spiral drift", "Orbit shimmer", "Veil drift",
    "Solar burst", "Bounce loop", "Wiggle motion", "Coil & stretch",
    "Pop-up animation", "Data pulse", "Glitch loop", "Jet roar",
    "Web spin", "Branch sway", "Drift & swirl", "Lightning dash",
    "Shuffle & sprout", "Spiral float", "Slow orbit", "Reverse shimmer",
    "Echo pulse", "Fractal bloom", "Phase flicker", "Light pulse",
    "Beat loop", "Sound ripple", "Color shift", "Symbol rotation"
]

ELEMENTAL_AFFINITIES = [
    "Earth", "Fire", "Water", "Air", "Shadow", "Light", "Nature",
    "Storm", "Ice", "Lightning", "Spirit", "Time", "Space", "Void",
    "Sound", "Energy", "Magic", "Code", "Electric", "Gravity", "Cosmic"
]

ENVIRONMENTS = [
    "Savannah", "Forest", "Ocean", "Jungle", "Desert", "Cliffs", "Garden",
    "Mountain", "Sky", "Glade", "Plateau", "Ruins", "Temple", "Cave",
    "Volcano", "Riverbank", "Deep sea", "Reef", "Lagoon", "Tower",
    "Shrine", "Sacred Grove", "Marsh", "Playground", "Toybox", "Arcade",
    "Kitchen", "Server room", "Cyberspace", "Skyscraper", "Terminal",
    "Grove", "Nebula", "Void", "Chronoscape", "Chamber", "Dimension Fold",
    "Rift", "Core", "Prism", "Archive", "Night sky", "Horizon"
]

def generate_creature_name(species, subspecies, colouring, style, mood):
    """Generate a unique creature name based on its attributes"""
    # Extract primary color
    color_parts = colouring.split('&')[0].strip()
    color_word = color_parts.split()[0]

    # Create name variations based on different patterns
    patterns = [
        f"{mood} {color_word} {subspecies}",
        f"{color_word} {style} {subspecies}",
        f"{subspecies} of {color_word} {style}",
        f"The {mood} {subspecies}",
        f"{color_word}wing {subspecies}",
        f"{style} {subspecies} of {species}",
    ]

    # Use hash of all attributes to deterministically select a pattern
    attr_hash = hash(f"{species}{subspecies}{colouring}{style}{mood}")
    pattern_index = abs(attr_hash) % len(patterns)

    return patterns[pattern_index]

def generate_all_creatures():
    """Generate all creature combinations"""
    creatures = []
    creature_id = 1

    # For each species/subspecies combination
    for category, species, subspecies_list in SPECIES_DATA:
        for subspecies in subspecies_list:
            # Generate combinations for this subspecies
            # To keep the dataset manageable, we'll create a subset of all possible combinations
            # Using about 20-30 combinations per subspecies

            # Select compatible dimension values
            for colouring in COLOURINGS[:3]:  # Limit colourings to keep size manageable
                for style in STYLES[:2]:  # Limit styles
                    for mood in MOODS[:2]:  # Limit moods
                        for motion_type in MOTION_TYPES[:2]:  # Limit motions
                            # Pick compatible elemental affinity and environment
                            elemental_affinity = ELEMENTAL_AFFINITIES[creature_id % len(ELEMENTAL_AFFINITIES)]
                            environment = ENVIRONMENTS[creature_id % len(ENVIRONMENTS)]

                            creature_name = generate_creature_name(
                                species, subspecies, colouring, style, mood
                            )

                            creatures.append({
                                'id': creature_id,
                                'creature_name': creature_name,
                                'category': category,
                                'species': species,
                                'subspecies': subspecies,
                                'colouring': colouring,
                                'style': style,
                                'mood': mood,
                                'motion_type': motion_type,
                                'elemental_affinity': elemental_affinity,
                                'environment': environment
                            })

                            creature_id += 1

    return creatures

def save_to_csv(creatures, output_path):
    """Save creatures to CSV file"""
    fieldnames = [
        'id', 'creature_name', 'category', 'species', 'subspecies',
        'colouring', 'style', 'mood', 'motion_type',
        'elemental_affinity', 'environment'
    ]

    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(creatures)

def save_dimensions_to_csv(data_dir):
    """Save dimension lists to separate CSV files for review"""
    dimensions = {
        'species': [],
        'subspecies': [],
        'colourings': COLOURINGS,
        'styles': STYLES,
        'moods': MOODS,
        'motion_types': MOTION_TYPES,
        'elemental_affinities': ELEMENTAL_AFFINITIES,
        'environments': ENVIRONMENTS
    }

    # Extract species and subspecies
    for category, species, subspecies_list in SPECIES_DATA:
        dimensions['species'].append({'category': category, 'species': species})
        for subspecies in subspecies_list:
            dimensions['subspecies'].append({
                'category': category,
                'species': species,
                'subspecies': subspecies
            })

    # Save species
    with open(data_dir / 'dim_species.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['category', 'species'])
        writer.writeheader()
        writer.writerows(dimensions['species'])

    # Save subspecies
    with open(data_dir / 'dim_subspecies.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['category', 'species', 'subspecies'])
        writer.writeheader()
        writer.writerows(dimensions['subspecies'])

    # Save other dimensions as simple lists
    for dim_name, dim_values in dimensions.items():
        if dim_name not in ['species', 'subspecies']:
            with open(data_dir / f'dim_{dim_name}.csv', 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow([dim_name.rstrip('s')])
                for value in dim_values:
                    writer.writerow([value])

if __name__ == '__main__':
    # Get data directory
    script_dir = Path(__file__).parent.parent
    data_dir = script_dir / 'data'
    data_dir.mkdir(exist_ok=True)

    print("Generating all creatures...")
    creatures = generate_all_creatures()
    print(f"Generated {len(creatures)} creatures")

    print("Saving to CSV...")
    output_path = data_dir / 'all_creatures.csv'
    save_to_csv(creatures, output_path)
    print(f"Saved to {output_path}")

    print("Saving dimension tables...")
    save_dimensions_to_csv(data_dir)
    print("Dimension tables saved")

    print("\nDone!")
    print(f"Total creatures: {len(creatures)}")
    print(f"Species categories: {len(SPECIES_DATA)}")
