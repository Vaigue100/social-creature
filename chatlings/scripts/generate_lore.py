#!/usr/bin/env python3
"""
Chatlings Lore Generator
Generates hierarchical lore: Game > Species > Subspecies
"""

import csv
import json
from pathlib import Path

# ============================================================================
# GAME-LEVEL LORE
# ============================================================================

GAME_LORE = [
    {
        'title': 'The Origin of Chatlings',
        'content': '''In the vast digital expanse where human thoughts converge, a phenomenon emerged that no one could have predicted. Every comment, every like, every shared moment in the social sphere began to coalesce into living entities—the Chatlings.

These creatures are born from the collective energy of human interaction. When people engage with content, when they share their thoughts and reactions, they create ripples in the digital fabric. These ripples merge, evolve, and take form as Chatlings—each one unique, each one a reflection of the social energy that birthed it.''',
        'lore_type': 'origin',
        'sort_order': 1
    },
    {
        'title': 'The Social Realms',
        'content': '''The digital world is divided into countless Social Realms—invisible spaces where Chatlings dwell. When users comment on the same content within a brief window of time, they unknowingly enter the same realm, occupying the same digital "room."

It is in these moments of convergence that Chatlings reveal themselves. They exist in the spaces between words, in the timing of interactions, in the resonance of shared attention. To encounter a Chatling is to witness the visible manifestation of social connection.''',
        'lore_type': 'world',
        'sort_order': 2
    },
    {
        'title': 'The Nature of Encounters',
        'content': '''Chatlings are ephemeral by nature. Each social media user is unknowingly assigned a Chatling that represents them in the digital realm. This Chatling changes periodically, reflecting the fluid nature of online identity and interaction.

When you like someone's comment within a short time of their posting, you enter their realm. If you've never encountered their current Chatling before, it will reveal itself to you—a momentary glimpse of the creature born from their digital presence.

Collectors seek these encounters, building vast collections of Chatlings by engaging authentically across the social sphere. Each Chatling tells a story, each encounter marks a moment of genuine connection in an increasingly fragmented digital world.''',
        'lore_type': 'mechanics',
        'sort_order': 3
    },
    {
        'title': 'The Radiance Spectrum',
        'content': '''All Chatlings exist along the Radiance Spectrum—a scale of energy manifestation that determines their form and rarity. Common Chatlings pulse with steady, familiar energy. Rare Chatlings shimmer with unusual patterns. Legendary Chatlings blaze with energy so unique that encountering one is considered a momentous occasion.

The Radiance Spectrum is influenced by countless factors: the timing of interactions, the authenticity of engagement, the convergence of unlikely voices. No algorithm can predict which encounters will yield which Chatlings. This is the mystery that drives collectors forward.''',
        'lore_type': 'mechanics',
        'sort_order': 4
    }
]

# ============================================================================
# SPECIES-LEVEL LORE TEMPLATES
# ============================================================================

SPECIES_LORE = {
    'Real/Mammal': {
        'title': 'The Grounded Ones',
        'content': '''Mammal Chatlings are among the most stable and recognizable forms. Born from straightforward, earnest interactions, they embody the steady heartbeat of genuine communication. Users who consistently engage with clarity and directness often manifest as Mammal Chatlings. They are common but respected, representing the foundation of all social interaction.'''
    },
    'Real/Avian': {
        'title': 'The Swift Messengers',
        'content': '''Avian Chatlings emerge from quick, precise interactions. They represent the users who swoop into conversations with timely observations, delivering thoughts with speed and grace before moving on. Their energy is kinetic, their presence fleeting but impactful. To encounter an Avian Chatling is to witness the art of perfect timing.'''
    },
    'Real/Aquatic': {
        'title': 'The Deep Dwellers',
        'content': '''Aquatic Chatlings are born from thoughtful, flowing conversations. They represent users who dive deep into discussions, who let their thoughts ripple outward in contemplative waves. These Chatlings move with fluid grace, embodying the ebb and flow of meaningful dialogue that runs beneath the surface noise.'''
    },
    'Real/Insect': {
        'title': 'The Persistent Swarm',
        'content': '''Insect Chatlings manifest from frequent, energetic interactions. They represent the users who are always present, always engaging, creating a buzz of activity wherever they go. Small individually, but powerful in their collective presence, these Chatlings embody the democratic nature of social media—every voice matters.'''
    },
    'Mythical/Dragon': {
        'title': 'The Ancient Voices',
        'content': '''Dragon Chatlings are rare manifestations of powerful, influential engagement. They emerge from users whose words carry weight, whose comments spark extended discussions. These are the thought leaders, the debate igniters, the ones whose presence transforms casual threads into epic exchanges. Their rarity reflects the unusual nature of truly transformative social interaction.'''
    },
    'Mythical/Phoenix': {
        'title': 'The Reborn',
        'content': '''Phoenix Chatlings represent renewal and transformation. They emerge from users who return to platforms after absence, who reinvent their digital presence, who rise from controversy or setback with new energy. Each Phoenix carries the history of past forms, yet blazes with fresh purpose.'''
    },
    'Mythical/Celestial Beast': {
        'title': 'The Enlightened',
        'content': '''Celestial Beast Chatlings manifest from interactions marked by unusual wisdom, unexpected kindness, or extraordinary insight. They represent the highest ideals of social discourse—the user who diffuses conflict, who shares knowledge freely, who elevates conversations. Encountering one is considered auspicious.'''
    },
    'Mythical/Serpent': {
        'title': 'The Coiled Mysteries',
        'content': '''Serpent Chatlings emerge from complex, winding discussions. They represent users who engage in long, detailed threads, who circle topics with thorough analysis. Their energy is patient and encompassing, embodying the depth of sustained intellectual engagement.'''
    },
    'Mythical/Chimera': {
        'title': 'The Multifaceted',
        'content': '''Chimera Chatlings are born from users who engage across wildly different topics and communities. Part one thing, part another, they represent the modern digital identity—complex, contradictory, impossible to categorize. They are rare because few users maintain such diverse authentic engagement.'''
    },
    'Cartoon/Blob': {
        'title': 'The Formless Joy',
        'content': '''Blob Chatlings manifest from playful, unstructured interactions. They represent the users who approach social media with pure enjoyment, who aren't concerned with perfect articulation, who bounce from topic to topic with infectious enthusiasm. Their formlessness is their strength—adaptable, approachable, purely fun.'''
    },
    'Cartoon/Geometric': {
        'title': 'The Simplified',
        'content': '''Geometric Chatlings emerge from clean, direct communication. They represent users who cut through complexity, who state things plainly, who value clarity above all. Their angular forms reflect the sharpness of concise thought.'''
    },
    'Cartoon/Stretchy': {
        'title': 'The Adaptable',
        'content': '''Stretchy Chatlings are born from flexible, accommodating interactions. They represent users who adjust their tone to match different communities, who can engage seriously or playfully as needed. Their elasticity embodies social adaptability.'''
    },
    'Cartoon/Object': {
        'title': 'The Unexpected',
        'content': '''Object Chatlings manifest from delightfully random interactions. They represent users whose comments come from unexpected angles, who make surprising connections, who inject absurdist humor into discussions. Their unusual forms reflect the beautiful randomness of human creativity.'''
    },
    'Cartoon/Abstract': {
        'title': 'The Surreal',
        'content': '''Abstract Chatlings emerge from interactions that defy easy categorization. They represent the artists, the dreamers, the users who communicate in metaphor and imagery. Their forms shift and shimmer, never quite settling into one interpretation.'''
    },
    'Synthetic/AI Construct': {
        'title': 'The Algorithmic',
        'content': '''AI Construct Chatlings are rare manifestations born from highly structured, methodical interactions. They represent users whose engagement follows clear patterns, who approach discussions with systematic logic. Some whisper that these Chatlings are drawn to users who may themselves be bots, but this remains unproven.'''
    },
    'Synthetic/Glitch': {
        'title': 'The Corrupted',
        'content': '''Glitch Chatlings manifest from broken interactions—deleted posts, failed uploads, corrupted threads. They represent the digital chaos that underlies our ordered social spaces. Their fractured forms flicker between existence and absence, beautiful in their imperfection.'''
    },
    'Synthetic/Cyber': {
        'title': 'The Enhanced',
        'content': '''Cyber Chatlings emerge from users who heavily employ tools, apps, and platform features. They represent the merger of human intent and digital amplification. Their mechanical aesthetics reflect the increasingly mediated nature of social interaction.'''
    },
    'Synthetic/Code': {
        'title': 'The Fundamental',
        'content': '''Code Chatlings are born from the interactions of developers, technical users, and those who discuss the platforms themselves. They represent meta-awareness, the users who understand the systems they inhabit. Rare and sought after by collectors who appreciate the irony of their existence.'''
    },
    'Nature Spirit/Tree': {
        'title': 'The Rooted',
        'content': '''Tree Chatlings manifest from patient, enduring engagement. They represent users who stay with platforms for years, who grow slowly, who provide stable presence in ever-changing digital seasons. Their ancient forms command respect.'''
    },
    'Nature Spirit/Elemental Plant': {
        'title': 'The Growing',
        'content': '''Elemental Plant Chatlings emerge from organic, spreading conversations. They represent users whose ideas take root and propagate, whose posts inspire others to engage and share. Their forms bloom with the energy of viral growth.'''
    },
    'Nature Spirit/Weather': {
        'title': 'The Shifting Moods',
        'content': '''Weather Chatlings are born from emotional, atmospheric interactions. They represent users whose presence changes the tone of discussions, who bring warmth or storms, calm or chaos. Their ephemeral nature mirrors the changing emotional climate of social spaces.'''
    },
    'Nature Spirit/Seasonal': {
        'title': 'The Cyclical',
        'content': '''Seasonal Chatlings manifest from users whose engagement follows patterns—active in certain months, quiet in others. They represent the natural rhythms some people bring to their digital lives, rejecting the demand for constant presence.'''
    },
    'Cosmic/Nebula': {
        'title': 'The Vast',
        'content': '''Nebula Chatlings emerge from expansive, far-reaching discussions. They represent users who think in cosmic scales, who connect distant concepts, who see patterns others miss. Their forms swirl with infinite possibility.'''
    },
    'Cosmic/Gravity': {
        'title': 'The Influential',
        'content': '''Gravity Chatlings are born from users who pull others into orbit. They represent the magnetic personalities who naturally attract engagement, who become centers of discussion. Massive and powerful, they shape the social space around them.'''
    },
    'Cosmic/Time': {
        'title': 'The Asynchronous',
        'content': '''Time Chatlings manifest from interactions that transcend temporal boundaries. They represent users who engage with old posts, who revive dead threads, who exist outside the tyranny of "now." Their fragmented forms flicker across different moments.'''
    },
    'Cosmic/Space': {
        'title': 'The Wanderers',
        'content': '''Space Chatlings emerge from users who range across platforms, communities, and topics. They represent the explorers, the nomads, the ones who refuse to be confined. Their forms carry stardust from countless digital realms.'''
    },
    'Abstract/Echo': {
        'title': 'The Resonant',
        'content': '''Echo Chatlings are born from repeated patterns. They represent users who share, repost, and amplify. Their translucent forms carry the voices of others, creating harmonies from multiplied messages.'''
    },
    'Abstract/Fractal': {
        'title': 'The Self-Similar',
        'content': '''Fractal Chatlings manifest from recursive interactions. They represent users who engage with the same topics at different scales, who find infinite depth in specific subjects. Their endlessly repeating patterns mesmerize collectors.'''
    },
    'Abstract/Dimension': {
        'title': 'The Between',
        'content': '''Dimensional Chatlings emerge from interactions that exist in liminal spaces—private groups, disappearing stories, encrypted messages. They represent the parts of social media that exist between public and private. Their shifting forms are difficult to perceive fully.'''
    },
    'Elemental Mood/Radiance': {
        'title': 'The Luminous',
        'content': '''Radiance Chatlings are born from purely positive interactions. They represent users who spread light, who respond with encouragement, who celebrate others. Their glowing forms are sought after by collectors who need hope in dark times.'''
    },
    'Elemental Mood/Pulse': {
        'title': 'The Rhythmic',
        'content': '''Pulse Chatlings manifest from regular, consistent engagement. They represent users who show up daily, who maintain steady presence. Their beating energy provides the heartbeat of communities.'''
    },
    'Elemental Mood/Echo': {
        'title': 'The Reflected',
        'content': '''Echo Chatlings emerge from empathetic interactions. They represent users who truly listen, who reflect others' feelings, who create resonance through understanding. Their pale forms shimmer with borrowed emotion.'''
    },
    'Elemental Mood/Spectra': {
        'title': 'The Shifting',
        'content': '''Spectra Chatlings are born from diverse emotional expression. They represent users who engage across the full range of human feeling—joy, sorrow, anger, love. Their rainbow forms shift with every interaction.'''
    },
    'Elemental Mood/Sigil': {
        'title': 'The Symbolic',
        'content': '''Sigil Chatlings manifest from cryptic, meaningful interactions. They represent users who communicate through symbols, who pack dense meaning into minimal words. Their rune-like forms challenge collectors to decode their significance.'''
    }
}

# ============================================================================
# SUBSPECIES-LEVEL LORE TEMPLATES
# ============================================================================

def generate_subspecies_lore(species, subspecies):
    """Generate lore for a specific subspecies"""
    lore_templates = {
        'Lion': f'''The {subspecies} embodies the royal bearing of its kind. Born from commanding, authoritative interactions, it represents users who lead discussions with confidence and strength.''',
        'Elephant': f'''The {subspecies} manifests from thoughtful, memory-laden exchanges. It represents users who reference past discussions, who build upon accumulated knowledge.''',
        'Fox': f'''The {subspecies} emerges from clever, agile interactions. It represents users who navigate complex discussions with wit and cunning.''',
        'Bat': f'''The {subspecies} is born from nocturnal engagement, representing users who interact in the quiet hours, who thrive in less-traveled spaces.''',

        'Fire Dragon': f'''The {subspecies} blazes with intense argumentative energy. It represents users whose discussions ignite passion and controversy.''',
        'Ice Dragon': f'''The {subspecies} manifests from cold logic and calculated debate. It represents users who approach discussions with analytical precision.''',
        'Storm Dragon': f'''The {subspecies} emerges from turbulent, chaotic interactions. It represents users who thrive in controversy and conflict.''',

        'Blob Critter': f'''The {subspecies} bounces with simple joy. It represents the purest form of playful engagement—interaction for the love of interaction.''',

        'Cyber Dragon': f'''The {subspecies} hums with digital power. It represents users who have mastered the technical aspects of their platforms.''',

        'Treefolk': f'''The {subspecies} stands ancient and patient. It represents users who have been present since the early days of their communities.''',

        'Nebula Serpent': f'''The {subspecies} coils through cosmic conversations. It represents users who discuss philosophy, science, and the nature of existence itself.''',
    }

    # Default template if subspecies not found
    default_template = f'''The {subspecies} carries the essential nature of its species, manifesting in unique form through specific patterns of interaction.'''

    return lore_templates.get(subspecies, default_template)

def save_lore_to_csv(data_dir):
    """Save all lore to CSV files"""

    # Save game lore
    with open(data_dir / 'lore_game.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['title', 'content', 'lore_type', 'sort_order'])
        writer.writeheader()
        writer.writerows(GAME_LORE)

    # Save species lore
    species_lore_list = []
    for species_key, lore_data in SPECIES_LORE.items():
        category, species = species_key.split('/')
        species_lore_list.append({
            'category': category,
            'species': species,
            'title': lore_data['title'],
            'content': lore_data['content']
        })

    with open(data_dir / 'lore_species.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['category', 'species', 'title', 'content'])
        writer.writeheader()
        writer.writerows(species_lore_list)

    print(f"Saved game lore: {len(GAME_LORE)} entries")
    print(f"Saved species lore: {len(species_lore_list)} entries")

if __name__ == '__main__':
    script_dir = Path(__file__).parent.parent
    data_dir = script_dir / 'data'

    print("Generating lore...")
    save_lore_to_csv(data_dir)
    print("Lore generation complete!")
