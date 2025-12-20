# Hierarchical Team System

## Overview

The new hierarchical team system replaces the flat 5-member team structure with a strategic 4-level organizational hierarchy. Teams can have up to **8 members** with parent-child relationships that create powerful synergies through:

- **Rizz Cascade (Vertical)**: Leaders boost their team members' Glow
- **Body Type Affinity (Horizontal)**: Matching body types create bonus connections
- **Role Specialization**: Each position has unique multipliers and bonuses

## Team Structure

```
Level 1: ARCHITECT (1 slot)
         Strategic leader
         └─ Affects entire organization

Level 2: PRIME CHATLING (1 slot)
         Second-in-command
         └─ Manages departments

Level 3: DEPARTMENT HEADS (3 slots)
         ├─ ANALYST (Intelligence specialist)
         ├─ ENGINEER (Technical specialist)
         └─ CLERK (Administrative specialist)

Level 4: ASSISTANTS (3 slots, one per dept head)
         ├─ Analyst's Assistant
         ├─ Engineer's Assistant
         └─ Clerk's Assistant

Total: 8 possible team members
```

## Glow Calculation

### Vertical Bonuses (Rizz Cascade)

Each chatling's Glow is boosted by their chain of command:

```
Effective Glow = Base Glow
               + (Parent Rizz × 10%)
               + (Grandparent Rizz × 5%)
               + (Great-grandparent Rizz × 2%)
```

**Example:**
```
Assistant under Analyst:
- Base Glow: 3
- Analyst Rizz: 7 → +0.7 (10%)
- Prime Rizz: 5 → +0.25 (5%)
- Architect Rizz: 8 → +0.16 (2%)
= Effective Glow: 4.11
```

### Horizontal Bonuses (Body Type Affinity)

Matching body types create powerful synergies:

| Connection Type | Bonus | Description |
|----------------|-------|-------------|
| Parent Match | +1.0 | Same body type as your boss |
| Sibling Match | +0.5 each | Per teammate at same level with same body type (max +1.5) |
| Child Match | +0.3 each | Per direct report with same body type (max +1.0) |

**Example - Mono Body Type Team (all Gen Z):**
```
Analyst (Gen Z):
- Parent match (Prime is Gen Z): +1.0 ✨
- Sibling match (2 Gen Z siblings): +1.0 ✨
- Rizz from Prime (5): +0.5
- Rizz from Architect (6): +0.3
= Total Glow bonus: +2.8
```

**Strategic Decision:**
- High-stat diverse chatling: Higher base power
- Lower-stat matching chatling: Team synergy bonuses

## Role Multipliers

Each position contributes differently to team score:

```javascript
Role Multipliers:
- Architect:  1.5× (Leader bonus)
- Prime:      1.3× (Second-in-command)
- Analyst:    1.2× (Specialist)
- Engineer:   1.2× (Specialist)
- Clerk:      1.2× (Specialist)
- Assistant:  1.0× (Entry level)
```

### Specialist Bonuses

Level 3 positions get **double value** for their specialty traits:

- **Analyst**: Creativity & Wisdom traits count 2×
- **Engineer**: Confidence & Team Player traits count 2×
- **Clerk**: Energy Level & Empathy traits count 2×

## Team Score Calculation

```
Total Score = (Base Score + Synergy Bonus)
            × (1 + Affinity Diversity Multiplier)
            + Tier Completion Bonuses

Where:
- Base Score = Σ(Effective Traits × Role Multiplier)
- Synergy Bonus = Base Score × (0.15 × num_positions_filled)
- Affinity Diversity = (diversity_bonus + affinity_bonus)
- Tier Bonuses = 150 (L2) + 300 (L3 full) + 450 (L4 full)
```

### Example Scores

**Solo Architect (Legendary, 420 traits):**
```
Base: 420 × 1.5 = 630
Synergy: 630 × 0.15 = 94.5
Total: ~725
```

**Full 8-Member Team (mixed rarities):**
```
Base: ~1,800
Synergy: 1,800 × (0.15 × 8) = 2,160
Affinity boost: ×1.15
Tier bonuses: +900
Total: ~3,384
```

**Adding team members is ALWAYS beneficial!**

## Migration from Old System

### Before (Flat Structure):
```
- Architect (current_creature_id)
- Prime Chatling (team_member_2_id)
- Member 3 (team_member_3_id)
- Member 4 (team_member_4_id)
- Member 5 (team_member_5_id)
```

### After (Hierarchical):
```
Level 1: Architect (migrated from current_creature_id)
Level 2: Prime (migrated from team_member_2_id)
Level 3: Analyst, Engineer, Clerk (migrated from team_member_3/4/5)
Level 4: Assistants (new positions, initially empty)
```

### Running Migration

```bash
node chatlings/scripts/run-migration-45.js
```

This will:
1. Create new `team_positions` table
2. Migrate existing teams to hierarchical structure
3. Preserve all creature assignments
4. Show statistics and sample teams

## API Endpoints

### GET /api/user/team/hierarchy
Get user's team with full scoring breakdown

**Response:**
```json
{
  "teamTree": {
    "architect": {
      "creature_id": "...",
      "creature_name": "Fluffy",
      "position_type": "architect",
      "level": 1,
      "body_type": "Cute",
      "rizz": 8,
      "base_glow": 5,
      "children": [...]
    }
  },
  "score": {
    "totalScore": 2380.50,
    "breakdown": {...},
    "members": [...]
  }
}
```

### POST /api/user/team/hierarchy/add
Add creature to team position

**Body:**
```json
{
  "creatureId": "uuid",
  "positionType": "analyst",
  "parentPositionId": 123
}
```

### DELETE /api/user/team/hierarchy/:positionId
Remove creature from position

### GET /api/user/team/hierarchy/available
Get available position slots

## UI Features

### Team Builder (`/user/team-builder.html`)

- **Org Chart Visualization**: Hierarchical tree view
- **Score Banner**: Real-time team score with breakdown
- **Affinity Indicators**: Visual badges showing body type matches
- **Drag & Drop**: Add/remove creatures easily
- **Glow Breakdown**: Hover tooltips showing all bonuses
- **Strategic Hints**: See contribution before adding

### Visual Indicators

- 🟢 **Green borders**: Body type affinity connections
- ✨ **Affinity badges**: Number of matching connections
- **Glow effects**: Cards with affinity bonuses shimmer
- **Color-coded rarities**: Instant rarity identification

## Strategy Guide

### Optimal Team Building

1. **Start Strong**: High-Rizz Architect boosts entire team
2. **Match or Diverse?**:
   - 2-3 body types = Sweet spot
   - All one type = Max affinity but limited traits
   - All different = Max diversity but no affinity

3. **Specialist Placement**: Put high Creativity chatlings as Analysts
4. **Fill Tiers**: Completion bonuses are huge (+900 total)
5. **Rizz Matters**: Even low-stat chatlings with high Rizz help the team

### Example Decisions

**Scenario: Adding Analyst**

Option A: Thunder (Gen X, Legendary)
- Traits: 450 (very high)
- No affinity with Cute team
- Final contribution: ~480

Option B: Buttons (Cute, Uncommon)
- Traits: 310 (lower)
- Matches Prime (parent) and Clerk (sibling)
- Final contribution: ~326
- BUT: +2.0 Glow bonus to team synergy

**Verdict**: Thunder for raw power, Buttons for team synergy. Both valid!

## Database Schema

```sql
-- Main team positions table
team_positions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  creature_id UUID NOT NULL,
  position_type VARCHAR(50), -- 'architect', 'prime', 'analyst', etc.
  level INTEGER,             -- 1-4
  parent_position_id INTEGER, -- FK to parent position
  created_at TIMESTAMP
)

-- Cached scores for performance
team_scores_cache (
  user_id UUID PRIMARY KEY,
  total_score NUMERIC,
  synergy_bonus NUMERIC,
  affinity_bonus NUMERIC,
  tier_completion_bonus NUMERIC,
  -- ... other metrics
)
```

## Files Changed

### New Files
- `chatlings/scripts/sql/45_hierarchical_teams.sql` - Database migration
- `chatlings/scripts/run-migration-45.js` - Migration runner
- `chatlings/services/team-calculator.js` - Scoring engine
- `chatlings/user/team-builder.html` - Org chart UI
- `chatlings/docs/HIERARCHICAL_TEAMS.md` - This file

### Modified Files
- `chatlings/admin-server.js` - Added hierarchy API endpoints (lines 3000-3337)

## Testing Checklist

- [ ] Run migration successfully
- [ ] Add Architect
- [ ] Add Prime Chatling
- [ ] Add 3 Department Heads
- [ ] Add Assistants
- [ ] Verify Rizz cascade calculations
- [ ] Verify affinity bonuses
- [ ] Test with mono-type team
- [ ] Test with diverse team
- [ ] Verify tier completion bonuses
- [ ] Test remove creature
- [ ] Check score recalculation

## Future Enhancements

Potential additions to consider:

1. **Team Perks**: Unlock special abilities at milestones
2. **Position Promotions**: Move chatlings up the hierarchy
3. **Team Challenges**: Compete with other users' teams
4. **Affinity Events**: Bonus rewards for matching teams
5. **Leadership Training**: Boost Rizz of specific chatlings
6. **Team Analytics**: Detailed breakdown charts
7. **Recommended Builds**: AI suggestions for optimal teams

## Support

For issues or questions:
- Check server logs: `chatlings/admin-server.js` console
- Verify migration ran: Check `team_positions` table
- Test API endpoints: Use browser dev tools
- Review score calculation: `/api/user/team/hierarchy` response
