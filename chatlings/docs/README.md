# Chatlings

A social media collecting game where every user is represented as a unique creature called a "Chatling". Users encounter Chatlings by interacting with social media content within time windows.

## 🚀 Getting Started

**First time setup?** → See [QUICK_START.md](QUICK_START.md) for step-by-step instructions.

**Got an error about `psql`?** → Use the Node.js setup method (no psql required):
```batch
cd scripts\bat
setup_nodejs.bat
```

## Project Structure

```
chatlings/
├── backend/              # Backend API and services
│   ├── src/
│   │   ├── api/         # API routes
│   │   ├── services/    # Business logic
│   │   ├── models/      # Data models
│   │   ├── config/      # Configuration files
│   │   └── database/    # Database utilities
│   └── tests/           # Backend tests
│
├── frontend-web/         # Web frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API services
│   │   └── assets/      # Images, styles, etc.
│   └── public/          # Static files
│
├── frontend-mobile/      # Mobile app (React Native)
│   └── src/
│       ├── screens/     # Mobile screens
│       ├── components/  # Mobile components
│       ├── services/    # API services
│       └── assets/      # Images, etc.
│
├── docs/                 # Documentation
│   ├── architecture/    # Architecture docs
│   ├── api/            # API documentation
│   └── user-guides/    # User guides
│
├── scripts/             # Utility scripts
│   ├── bat/            # Windows batch scripts
│   ├── sql/            # SQL scripts
│   └── deployment/     # Deployment scripts
│
└── data/                # Data files
    ├── all_creatures.csv         # All creature combinations (3408 total)
    ├── dim_*.csv                 # Dimension tables for review
    ├── lore_*.csv                # Lore data
    └── backups/                  # Database backups
```

## Database

### PostgreSQL Setup

**Connection Details:**
- Host: localhost
- Port: 5432
- Database: chatlings
- User: postgres
- Password: !1Swagger!1

### Quick Start - Two Methods

**Method 1: Node.js Setup (Recommended - No psql required)**

```batch
cd scripts\bat
setup_nodejs.bat
```

**Method 2: Using psql (Requires PostgreSQL bin in PATH)**

```batch
cd scripts\bat
setup_complete.bat
```

Both methods will:
- Create the `chatlings` database
- Create all tables (dimensions, creatures, lore, users)
- Import all dimension data
- Import all creature data (3,408 creatures)
- Import hierarchical lore (game, species, subspecies)

**Troubleshooting:** If you get a "psql is not recognized" error, use Method 1 (Node.js setup).

### Check PostgreSQL Installation

```batch
cd scripts\bat
check_postgres.bat
```

This will tell you if PostgreSQL is installed and if psql is in your PATH.

## Database Schema

### Dimension Tables
- `dim_species` - Species categories (Real, Mythical, Cartoon, etc.)
- `dim_subspecies` - Specific subspecies (Lion, Dragon, etc.)
- `dim_colouring` - Color combinations
- `dim_style` - Visual styles (Naturalistic, Gothic, etc.)
- `dim_mood` - Creature moods (Proud, Fierce, etc.)
- `dim_motion_type` - Animation types
- `dim_elemental_affinity` - Elemental types (Fire, Water, etc.)
- `dim_environment` - Background environments

### Main Tables
- `creatures` - All creature combinations (3408 total)
  - Unique combinations of all dimensions
  - Each has a generated name
  - Rarity tier assigned (Common, Uncommon, Rare, Epic, Legendary)

### Lore Tables (Hierarchical)
- `lore_game` - Overall game world and mechanics
- `lore_species` - Lore for each species category
- `lore_subspecies` - Lore for specific subspecies
- Creatures can have individual `character_lore` in the creatures table

### User Tables
- `users` - User accounts
  - `current_creature_id` - The Chatling they currently represent
  - Creature changes periodically (default: every 24 hours)
- `user_encounters` - Track which users have encountered which creatures

## Creature Data

### Statistics
- **Total Creatures:** 3,408
- **Species Categories:** 8 (Real, Mythical, Cartoon, Synthetic, Nature Spirit, Cosmic, Abstract, Elemental Mood)
- **Species Types:** 34
- **Subspecies:** 100+
- **Dimensions:** 8 different dimensions combined to create unique creatures

### Rarity Distribution
- **Common:** ~60% (most frequent dimension combinations)
- **Uncommon:** ~25%
- **Rare:** ~10%
- **Epic:** ~4%
- **Legendary:** ~1% (rarest combinations)

## Utility Scripts

### Database Management

**Start Services:**
```batch
scripts\bat\start_services.bat
```
Starts PostgreSQL service (adjust service name if needed)

**Backup Database:**
```batch
scripts\bat\backup_database.bat
```
Creates timestamped backup in `data\backups\`

**Setup Database:**
```batch
scripts\bat\setup_database.bat
```
Creates database and tables (no data)

**Complete Setup:**
```batch
scripts\bat\setup_complete.bat
```
Full setup including all data import

### Data Generation

**Generate Creatures:**
```python
python scripts\generate_creatures.py
```
Generates all creature combinations with names

**Generate Lore:**
```python
python scripts\generate_lore.py
```
Generates hierarchical lore system

## Game Concept

### Core Mechanics

1. **User Representation:**
   - Every social media user is randomly assigned a Chatling
   - Chatlings change periodically (e.g., every 24 hours)

2. **Encounters:**
   - Users enter a "room" by commenting on the same content
   - If a user likes a comment within 1 hour, an encounter triggers
   - The original poster is always "in the room"

3. **Collection:**
   - Users collect Chatlings they encounter
   - Only new encounters are notified
   - Rarer Chatlings are more valuable

4. **Radiance System:**
   - All Chatlings exist along a "Radiance Spectrum"
   - Different manifestations: Radiance, Echo, Pulse, Spectra, Sigil
   - Visual variations based on interaction type

### Lore Hierarchy

1. **Game Lore** - Origin of Chatlings, Social Realms, mechanics
2. **Species Lore** - Characteristics of each species category
3. **Subspecies Lore** - Specific traits of subspecies
4. **Character Lore** - Individual Chatling stories (stored per creature)

## Animation Pipeline

### Kaiber AI Integration

The game will use Kaiber AI for animation generation:
- **Format:** MP4, WebP, or Lottie JSON
- **Duration:** ~5 seconds per animation
- **Loop Style:** Ping-pong (forward then reverse)
- **Estimated Cost:** $2,500-$10,000 for 10,000 animations

### Animation Prompts

Each creature's animation is generated from its dimensions:
```
Species + Subspecies + Colouring + Style + Mood + Motion Type + Environment
```

Example prompt:
```
Create a glowing, serpentine creature made of segmented light,
moving in a smooth wave-like motion. Use crimson and gold colors
with a regal style. Set against a mountain backdrop with subtle
particles. The creature should pulse with fierce energy.
```

## Next Steps

### Development Roadmap

1. **Backend API**
   - [ ] Set up Node.js/Express server
   - [ ] Create API endpoints for creatures
   - [ ] Implement user authentication
   - [ ] Build encounter detection system
   - [ ] Social media API integration

2. **Frontend Web**
   - [ ] Set up React application
   - [ ] Design creature collection UI
   - [ ] Build encounter animation display
   - [ ] Create user profile pages

3. **Frontend Mobile**
   - [ ] Set up React Native application
   - [ ] Design mobile-optimized UI
   - [ ] Implement push notifications

4. **Animation Generation**
   - [ ] Contact Kaiber for API access
   - [ ] Create animation generation pipeline
   - [ ] Generate and store animations

5. **Azure Deployment**
   - [ ] Set up Azure resources
   - [ ] Deploy PostgreSQL database
   - [ ] Deploy backend services
   - [ ] Deploy frontend applications

## License

TBD

## Contact

TBD
