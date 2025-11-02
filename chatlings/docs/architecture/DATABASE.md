# Chatlings Database Architecture

## Overview

The Chatlings database uses PostgreSQL with a normalized structure to store creatures, dimensions, lore, and user data.

## Design Principles

1. **Dimensional Modeling** - Creatures are composed of multiple dimensions (species, color, style, etc.)
2. **Hierarchical Lore** - Lore flows from Game → Species → Subspecies → Character
3. **Normalized Structure** - Dimensions are stored separately to avoid data duplication
4. **Performance** - Indexes on frequently queried columns
5. **Scalability** - UUID primary keys for distributed systems

## Schema Diagram

```
┌─────────────────┐
│   lore_game     │
│  (Game Lore)    │
└─────────────────┘

┌─────────────────┐      ┌──────────────────┐
│  dim_species    │──┬──→│  lore_species    │
│                 │  │   │  (Species Lore)  │
└─────────────────┘  │   └──────────────────┘
         │           │
         ├───────────┼────────────────┐
         │           │                │
         ▼           │                ▼
┌─────────────────┐  │   ┌──────────────────────┐
│ dim_subspecies  │──┴──→│  lore_subspecies     │
│                 │      │  (Subspecies Lore)   │
└─────────────────┘      └──────────────────────┘
         │
         │
         ▼
┌─────────────────────────────────────────┐
│             creatures                    │
│  (Main Creatures Table)                 │
│  ┌────────────────────────────────────┐ │
│  │ species_id  (FK)                   │ │
│  │ subspecies_id (FK)                 │ │
│  │ colouring_id (FK)                  │ │
│  │ style_id (FK)                      │ │
│  │ mood_id (FK)                       │ │
│  │ motion_type_id (FK)                │ │
│  │ elemental_affinity_id (FK)         │ │
│  │ environment_id (FK)                │ │
│  │ character_lore (TEXT)              │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
         │
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│     users       │      │ user_encounters  │
│                 │──┬──→│                  │
│ current_        │  │   │                  │
│ creature_id (FK)│  │   │                  │
└─────────────────┘  │   └──────────────────┘
                     │
                     └──→ creature_id (FK)
```

## Tables

### Dimension Tables

#### dim_species
Stores species categories.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| species_name | VARCHAR(100) | Unique species name |
| category | VARCHAR(50) | Category (Real, Mythical, etc.) |
| description | TEXT | Optional description |

**Categories:**
- Real
- Mythical
- Cartoon
- Synthetic
- Nature Spirit
- Cosmic
- Abstract
- Elemental Mood

#### dim_subspecies
Stores specific subspecies linked to species.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| subspecies_name | VARCHAR(100) | Unique subspecies name |
| species_id | INTEGER | Foreign key to dim_species |
| description | TEXT | Optional description |

#### dim_colouring
Stores color combinations.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| colouring_name | VARCHAR(100) | Color combination (e.g., "Gold & brown") |
| hex_primary | VARCHAR(7) | Primary hex color |
| hex_secondary | VARCHAR(7) | Secondary hex color |

**Examples:**
- "Gold & brown"
- "Crimson & gold"
- "Rainbow shimmer"

#### dim_style
Stores visual style types.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| style_name | VARCHAR(100) | Style name |
| description | TEXT | Style description |

**Examples:**
- Naturalistic
- Gothic
- Regal
- Cyberpunk
- Ethereal

#### dim_mood
Stores creature moods/personalities.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| mood_name | VARCHAR(100) | Mood name |
| description | TEXT | Mood description |

**Examples:**
- Proud
- Fierce
- Mysterious
- Playful
- Wise

#### dim_motion_type
Stores animation/motion patterns.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| motion_name | VARCHAR(100) | Motion type name |
| description | TEXT | Motion description |
| animation_template | VARCHAR(255) | Reference to animation template |

**Examples:**
- "Roaring stance"
- "Spiral drift"
- "Wing beat + roar"
- "Glitch loop"

#### dim_elemental_affinity
Stores elemental types.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| affinity_name | VARCHAR(100) | Element name |
| description | TEXT | Element description |
| particle_effect | VARCHAR(255) | Particle effect reference |

**Examples:**
- Fire
- Water
- Shadow
- Time
- Code

#### dim_environment
Stores background environments.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| environment_name | VARCHAR(100) | Environment name |
| description | TEXT | Environment description |
| background_template | VARCHAR(255) | Background template reference |

**Examples:**
- Savannah
- Volcano
- Cyberspace
- Nebula
- Sacred Grove

### Main Tables

#### creatures
Main table storing all creature combinations.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| creature_name | VARCHAR(255) | Unique generated name |
| species_id | INTEGER | FK to dim_species |
| subspecies_id | INTEGER | FK to dim_subspecies |
| colouring_id | INTEGER | FK to dim_colouring |
| style_id | INTEGER | FK to dim_style |
| mood_id | INTEGER | FK to dim_mood |
| motion_type_id | INTEGER | FK to dim_motion_type |
| elemental_affinity_id | INTEGER | FK to dim_elemental_affinity |
| environment_id | INTEGER | FK to dim_environment |
| character_lore | TEXT | Character-specific lore |
| rarity_tier | VARCHAR(50) | Common/Uncommon/Rare/Epic/Legendary |
| rarity_score | DECIMAL(5,2) | Numeric rarity (0-100) |
| animation_url | VARCHAR(500) | URL to animation file |
| animation_format | VARCHAR(20) | MP4, WebP, Lottie |
| thumbnail_url | VARCHAR(500) | Thumbnail image URL |
| is_active | BOOLEAN | Active status |

**Constraints:**
- Unique combination of all dimension FKs
- Ensures no duplicate creatures

### Lore Tables

#### lore_game
Game-level lore and world building.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| title | VARCHAR(255) | Lore title |
| content | TEXT | Lore content |
| lore_type | VARCHAR(50) | origin/mechanics/world/history |
| sort_order | INTEGER | Display order |

#### lore_species
Species-specific lore.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| species_id | INTEGER | FK to dim_species |
| title | VARCHAR(255) | Lore title |
| content | TEXT | Lore content |
| sort_order | INTEGER | Display order |

#### lore_subspecies
Subspecies-specific lore.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| subspecies_id | INTEGER | FK to dim_subspecies |
| title | VARCHAR(255) | Lore title |
| content | TEXT | Lore content |
| sort_order | INTEGER | Display order |

### User Tables

#### users
User accounts and current creature assignment.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| username | VARCHAR(100) | Unique username |
| email | VARCHAR(255) | Email address |
| current_creature_id | UUID | FK to creatures (current representation) |
| creature_rotation_interval | INTEGER | Rotation interval in seconds |
| last_creature_change | TIMESTAMP | Last rotation time |

#### user_encounters
Tracks creature encounters.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK to users |
| creature_id | UUID | FK to creatures |
| encountered_at | TIMESTAMP | First encounter time |
| encounter_count | INTEGER | Number of encounters |
| platform | VARCHAR(50) | Social platform (YouTube, Reddit, etc.) |
| post_url | TEXT | URL of the post where encounter happened |

**Constraints:**
- Unique (user_id, creature_id) - One record per user per creature

## Indexes

Performance indexes on frequently queried columns:

```sql
CREATE INDEX idx_creatures_species ON creatures(species_id);
CREATE INDEX idx_creatures_subspecies ON creatures(subspecies_id);
CREATE INDEX idx_creatures_rarity ON creatures(rarity_tier);
CREATE INDEX idx_creatures_active ON creatures(is_active);
CREATE INDEX idx_user_encounters_user ON user_encounters(user_id);
CREATE INDEX idx_user_encounters_creature ON user_encounters(creature_id);
CREATE INDEX idx_user_encounters_platform ON user_encounters(platform);
CREATE INDEX idx_users_current_creature ON users(current_creature_id);
```

## Sample Queries

### Get a creature with all its dimensions
```sql
SELECT
  c.id,
  c.creature_name,
  c.rarity_tier,
  ds.species_name,
  ds.category,
  dss.subspecies_name,
  dc.colouring_name,
  dst.style_name,
  dm.mood_name,
  dmt.motion_name,
  dea.affinity_name as elemental_affinity,
  de.environment_name,
  c.character_lore
FROM creatures c
LEFT JOIN dim_species ds ON c.species_id = ds.id
LEFT JOIN dim_subspecies dss ON c.subspecies_id = dss.id
LEFT JOIN dim_colouring dc ON c.colouring_id = dc.id
LEFT JOIN dim_style dst ON c.style_id = dst.id
LEFT JOIN dim_mood dm ON c.mood_id = dm.id
LEFT JOIN dim_motion_type dmt ON c.motion_type_id = dmt.id
LEFT JOIN dim_elemental_affinity dea ON c.elemental_affinity_id = dea.id
LEFT JOIN dim_environment de ON c.environment_id = de.id
WHERE c.id = 'some-uuid';
```

### Get all lore for a creature (hierarchical)
```sql
-- Game lore
SELECT * FROM lore_game ORDER BY sort_order;

-- Species lore for a creature
SELECT ls.*
FROM lore_species ls
JOIN creatures c ON ls.species_id = c.species_id
WHERE c.id = 'some-uuid';

-- Subspecies lore for a creature
SELECT lss.*
FROM lore_subspecies lss
JOIN creatures c ON lss.subspecies_id = c.subspecies_id
WHERE c.id = 'some-uuid';

-- Character lore
SELECT character_lore FROM creatures WHERE id = 'some-uuid';
```

### Get user's collection
```sql
SELECT
  c.*,
  ue.encountered_at,
  ue.encounter_count,
  ue.platform
FROM user_encounters ue
JOIN creatures c ON ue.creature_id = c.id
WHERE ue.user_id = 'user-uuid'
ORDER BY ue.encountered_at DESC;
```

### Get rarity distribution
```sql
SELECT
  rarity_tier,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM creatures
WHERE is_active = true
GROUP BY rarity_tier
ORDER BY
  CASE rarity_tier
    WHEN 'Legendary' THEN 1
    WHEN 'Epic' THEN 2
    WHEN 'Rare' THEN 3
    WHEN 'Uncommon' THEN 4
    WHEN 'Common' THEN 5
  END;
```

## Data Volume

Current production data:
- **Species:** 34
- **Subspecies:** 100+
- **Creatures:** 3,408
- **Color combinations:** 48
- **Styles:** 41
- **Moods:** 41
- **Motion types:** 56
- **Elemental affinities:** 21
- **Environments:** 42

## Backup Strategy

1. **Daily automated backups** using `backup_database.bat`
2. **Retention:** 30 days
3. **Storage:** Local + Azure Blob Storage
4. **Recovery:** Point-in-time recovery within retention period

## Future Considerations

1. **Partitioning** - Partition user_encounters by platform for better query performance
2. **Archiving** - Archive inactive creatures to separate table
3. **Caching** - Redis cache for frequently accessed creatures
4. **Read Replicas** - For scaling read operations
5. **Sharding** - Shard users table by geographic region if needed
