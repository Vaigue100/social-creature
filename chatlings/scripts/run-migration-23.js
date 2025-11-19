/**
 * Migration 23: Make all body types more thematic
 * - Add themed activities and quirks for Knights, Guardians, Beasts, Dragons, Mages, Spirits, Rangers
 * - Remove generic activities that don't fit the theme
 */

const { Client } = require('pg');
const config = { ...require('./db-config'), database: 'chatlings' };

async function addDimension(client, table, nameCol, name, prompt) {
  const existing = await client.query(`
    SELECT id FROM ${table} WHERE ${nameCol} = $1
  `, [name]);

  if (existing.rows.length === 0) {
    await client.query(`
      INSERT INTO ${table} (${nameCol}, prompt_text) VALUES ($1, $2)
    `, [name, prompt]);
    console.log(`  ✓ Added: ${name}`);
    return true;
  } else {
    console.log(`  - Already exists: ${name}`);
    return false;
  }
}

async function mapDimension(client, junctionTable, dimCol, dimId, bodyTypeId, name) {
  const existing = await client.query(`
    SELECT 1 FROM ${junctionTable}
    WHERE ${dimCol} = $1 AND body_type_id = $2
  `, [dimId, bodyTypeId]);

  if (existing.rows.length === 0) {
    await client.query(`
      INSERT INTO ${junctionTable} (${dimCol}, body_type_id)
      VALUES ($1, $2)
    `, [dimId, bodyTypeId]);
    console.log(`  ✓ Mapped: ${name}`);
  } else {
    console.log(`  - Already mapped: ${name}`);
  }
}

async function removeDimension(client, junctionTable, dimTable, dimCol, nameCol, bodyTypeId, dimName, bodyTypeName) {
  const result = await client.query(`
    DELETE FROM ${junctionTable}
    WHERE body_type_id = $1
      AND ${dimCol} IN (
        SELECT id FROM ${dimTable} WHERE ${nameCol} = $2
      )
  `, [bodyTypeId, dimName]);
  console.log(`  ✓ Removed from ${bodyTypeName}: ${dimName} (${result.rowCount} rows)`);
}

async function runMigration() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Migration 23: Making all body types more thematic\n');
    console.log('='.repeat(80));

    // ========================================================================
    // STEP 1: Add new thematic activities
    // ========================================================================
    console.log('\n1. Adding thematic activities...\n');

    console.log('Knights activities:');
    const knightActivities = [
      ['Polishing armor', 'polishing armor with cloth, maintenance pose'],
      ['Standing guard', 'standing at attention guard pose, vigilant'],
      ['Training with sword', 'practicing sword techniques, training pose'],
      ['Patrolling castle', 'walking patrol route, watchful pose'],
      ['Jousting practice', 'mounted on tiny horse, jousting pose'],
      ['Sharpening blade', 'sharpening sword on whetstone, focused pose'],
      ['Saluting', 'giving honorable salute, respectful pose']
    ];
    for (const [name, prompt] of knightActivities) {
      await addDimension(client, 'dim_social_activity', 'activity_name', name, prompt);
    }

    console.log('\nGuardian/Beast activities:');
    const guardianActivities = [
      ['Standing watch', 'standing watch position, alert and ready'],
      ['Patrolling grounds', 'patrolling back and forth, protective pose'],
      ['Protecting others', 'protective stance with shield pose'],
      ['Alert stance', 'ready alert position, vigilant'],
      ['Scanning horizon', 'looking around watchfully, scanning pose']
    ];
    for (const [name, prompt] of guardianActivities) {
      await addDimension(client, 'dim_social_activity', 'activity_name', name, prompt);
    }

    const beastActivities = [
      ['Prowling', 'prowling stealthily, predator pose'],
      ['Hunting', 'hunting pose with focused expression'],
      ['Roaring', 'roaring powerfully, intimidating pose'],
      ['Running wild', 'running wild and free, untamed pose'],
      ['Stalking prey', 'stalking in hunting crouch, stealthy pose'],
      ['Marking territory', 'territorial marking pose, claiming space']
    ];
    for (const [name, prompt] of beastActivities) {
      await addDimension(client, 'dim_social_activity', 'activity_name', name, prompt);
    }

    console.log('\nDragon activities:');
    const dragonActivities = [
      ['Hoarding treasure', 'sitting on pile of tiny treasures, possessive pose'],
      ['Breathing fire practice', 'breathing small flames, dragon pose'],
      ['Soaring through clouds', 'flying gracefully, majestic flight pose'],
      ['Perching majestically', 'perched on high point, regal pose'],
      ['Guarding hoard', 'guarding treasure protectively, watchful pose'],
      ['Stretching wings', 'stretching wings out wide, impressive pose']
    ];
    for (const [name, prompt] of dragonActivities) {
      await addDimension(client, 'dim_social_activity', 'activity_name', name, prompt);
    }

    console.log('\nMage/Spirit activities:');
    const mageActivities = [
      ['Casting spell', 'casting magical spell, mystical gesture pose'],
      ['Reading spellbook', 'reading ancient spellbook, scholarly pose'],
      ['Meditating', 'meditating peacefully, spiritual pose'],
      ['Brewing potion', 'brewing magical potion, alchemist pose'],
      ['Channeling magic', 'channeling magical energy, focused magic pose'],
      ['Studying runes', 'studying magical runes, concentrated pose'],
      ['Conjuring', 'conjuring magical effects, summoning pose']
    ];
    for (const [name, prompt] of mageActivities) {
      await addDimension(client, 'dim_social_activity', 'activity_name', name, prompt);
    }

    console.log('\nRanger activities:');
    const rangerActivities = [
      ['Tracking wildlife', 'tracking animal prints, ranger pose'],
      ['Climbing trees', 'climbing up tree, adventurous pose'],
      ['Setting up camp', 'setting up tiny campsite, outdoor pose'],
      ['Foraging', 'foraging for herbs and berries, gathering pose'],
      ['Scouting ahead', 'scouting terrain ahead, exploration pose'],
      ['Bird watching', 'watching birds with tiny binoculars, nature observer pose']
    ];
    for (const [name, prompt] of rangerActivities) {
      await addDimension(client, 'dim_social_activity', 'activity_name', name, prompt);
    }

    // ========================================================================
    // STEP 2: Add new thematic quirks
    // ========================================================================
    console.log('\n2. Adding thematic quirks...\n');

    console.log('Knights quirks:');
    const knightQuirks = [
      ['Wearing plume', 'wearing decorative helmet plume'],
      ['Polished armor', 'gleaming polished armor shine'],
      ['Battle scars', 'honorable battle scars visible'],
      ['Heraldic emblem', 'wearing heraldic emblem proudly']
    ];
    for (const [name, prompt] of knightQuirks) {
      await addDimension(client, 'dim_special_quirk', 'quirk_name', name, prompt);
    }

    console.log('\nGuardian/Beast quirks:');
    const guardianQuirks = [
      ['Battle-ready stance', 'always in battle-ready stance'],
      ['Protective aura', 'surrounded by protective aura'],
      ['Watchful eyes', 'intensely watchful eyes']
    ];
    for (const [name, prompt] of guardianQuirks) {
      await addDimension(client, 'dim_special_quirk', 'quirk_name', name, prompt);
    }

    const beastQuirks = [
      ['Wild mane', 'wild untamed mane'],
      ['Sharp claws visible', 'sharp claws clearly visible'],
      ['Fierce eyes', 'fierce predator eyes'],
      ['Primal markings', 'primal tribal markings on fur']
    ];
    for (const [name, prompt] of beastQuirks) {
      await addDimension(client, 'dim_special_quirk', 'quirk_name', name, prompt);
    }

    console.log('\nDragon quirks:');
    const dragonQuirks = [
      ['Treasure hoard', 'sitting on tiny treasure hoard'],
      ['Smoking nostrils', 'smoke puffing from nostrils'],
      ['Glittering scales', 'scales glittering magnificently'],
      ['Ancient wisdom', 'ancient wise expression']
    ];
    for (const [name, prompt] of dragonQuirks) {
      await addDimension(client, 'dim_special_quirk', 'quirk_name', name, prompt);
    }

    console.log('\nMage/Spirit quirks:');
    const mageQuirks = [
      ['Floating orb companion', 'accompanied by floating magical orb'],
      ['Mystical staff', 'carrying mystical staff'],
      ['Glowing runes', 'glowing magical runes on body'],
      ['Magical aura', 'surrounded by magical aura']
    ];
    for (const [name, prompt] of mageQuirks) {
      await addDimension(client, 'dim_special_quirk', 'quirk_name', name, prompt);
    }

    console.log('\nRanger quirks:');
    const rangerQuirks = [
      ['Carrying quiver', 'carrying quiver of arrows'],
      ['Nature companion', 'accompanied by small animal friend'],
      ['Camouflage gear', 'wearing natural camouflage'],
      ['Tracking tools', 'carrying tracking and survival tools']
    ];
    for (const [name, prompt] of rangerQuirks) {
      await addDimension(client, 'dim_special_quirk', 'quirk_name', name, prompt);
    }

    // ========================================================================
    // STEP 3: Get all body type IDs
    // ========================================================================
    console.log('\n3. Getting body type IDs...');
    const bodyTypes = await client.query(`
      SELECT id, body_type_name FROM dim_body_type
      WHERE body_type_name IN ('Knights', 'Guardians', 'Beasts', 'Dragons', 'Mages', 'Spirits', 'Rangers')
    `);

    const bodyTypeMap = {};
    bodyTypes.rows.forEach(bt => {
      bodyTypeMap[bt.body_type_name] = bt.id;
      console.log(`  ${bt.body_type_name}: ID ${bt.id}`);
    });

    // ========================================================================
    // STEP 4: Remove non-thematic activities
    // ========================================================================
    console.log('\n4. Removing non-thematic activities...\n');

    if (bodyTypeMap['Knights']) {
      console.log('Knights:');
      await removeDimension(client, 'dim_social_activity_body_types', 'dim_social_activity', 'activity_id', 'activity_name', bodyTypeMap['Knights'], 'Sipping coffee', 'Knights');
      await removeDimension(client, 'dim_social_activity_body_types', 'dim_social_activity', 'activity_id', 'activity_name', bodyTypeMap['Knights'], 'Gaming', 'Knights');
      await removeDimension(client, 'dim_social_activity_body_types', 'dim_social_activity', 'activity_id', 'activity_name', bodyTypeMap['Knights'], 'Attending meeting', 'Knights');
    }

    if (bodyTypeMap['Guardians']) {
      console.log('\nGuardians:');
      await removeDimension(client, 'dim_social_activity_body_types', 'dim_social_activity', 'activity_id', 'activity_name', bodyTypeMap['Guardians'], 'Gaming', 'Guardians');
      await removeDimension(client, 'dim_social_activity_body_types', 'dim_social_activity', 'activity_id', 'activity_name', bodyTypeMap['Guardians'], 'Celebrating', 'Guardians');
    }

    if (bodyTypeMap['Beasts']) {
      console.log('\nBeasts:');
      await removeDimension(client, 'dim_social_activity_body_types', 'dim_social_activity', 'activity_id', 'activity_name', bodyTypeMap['Beasts'], 'Gaming', 'Beasts');
      await removeDimension(client, 'dim_social_activity_body_types', 'dim_social_activity', 'activity_id', 'activity_name', bodyTypeMap['Beasts'], 'Celebrating', 'Beasts');
      await removeDimension(client, 'dim_social_activity_body_types', 'dim_social_activity', 'activity_id', 'activity_name', bodyTypeMap['Beasts'], 'Lifting weights', 'Beasts');
      await removeDimension(client, 'dim_social_activity_body_types', 'dim_social_activity', 'activity_id', 'activity_name', bodyTypeMap['Beasts'], 'Stretching at gym', 'Beasts');
    }

    if (bodyTypeMap['Dragons']) {
      console.log('\nDragons:');
      await removeDimension(client, 'dim_social_activity_body_types', 'dim_social_activity', 'activity_id', 'activity_name', bodyTypeMap['Dragons'], 'Gaming', 'Dragons');
      await removeDimension(client, 'dim_social_activity_body_types', 'dim_social_activity', 'activity_id', 'activity_name', bodyTypeMap['Dragons'], 'Celebrating', 'Dragons');
    }

    // ========================================================================
    // STEP 5: Map thematic activities to body types
    // ========================================================================
    console.log('\n5. Mapping thematic activities to body types...\n');

    // Knights
    if (bodyTypeMap['Knights']) {
      console.log('Knights:');
      const knightsActivities = [
        'Polishing armor', 'Standing guard', 'Training with sword', 'Patrolling castle',
        'Jousting practice', 'Sharpening blade', 'Saluting',
        'Teaching', 'Presenting', 'Doing nothing'
      ];
      for (const actName of knightsActivities) {
        const res = await client.query('SELECT id FROM dim_social_activity WHERE activity_name = $1', [actName]);
        if (res.rows.length > 0) {
          await mapDimension(client, 'dim_social_activity_body_types', 'activity_id', res.rows[0].id, bodyTypeMap['Knights'], actName);
        }
      }
    }

    // Guardians
    if (bodyTypeMap['Guardians']) {
      console.log('\nGuardians:');
      const guardiansActivities = [
        'Standing watch', 'Patrolling grounds', 'Protecting others', 'Alert stance',
        'Scanning horizon', 'Lifting weights', 'Stretching at gym', 'Doing nothing'
      ];
      for (const actName of guardiansActivities) {
        const res = await client.query('SELECT id FROM dim_social_activity WHERE activity_name = $1', [actName]);
        if (res.rows.length > 0) {
          await mapDimension(client, 'dim_social_activity_body_types', 'activity_id', res.rows[0].id, bodyTypeMap['Guardians'], actName);
        }
      }
    }

    // Beasts
    if (bodyTypeMap['Beasts']) {
      console.log('\nBeasts:');
      const beastsActivities = [
        'Prowling', 'Hunting', 'Roaring', 'Running wild', 'Stalking prey',
        'Marking territory', 'Doing nothing'
      ];
      for (const actName of beastsActivities) {
        const res = await client.query('SELECT id FROM dim_social_activity WHERE activity_name = $1', [actName]);
        if (res.rows.length > 0) {
          await mapDimension(client, 'dim_social_activity_body_types', 'activity_id', res.rows[0].id, bodyTypeMap['Beasts'], actName);
        }
      }
    }

    // Dragons
    if (bodyTypeMap['Dragons']) {
      console.log('\nDragons:');
      const dragonsActivities = [
        'Hoarding treasure', 'Breathing fire practice', 'Soaring through clouds',
        'Perching majestically', 'Guarding hoard', 'Stretching wings',
        'Hovering', 'Gazing Mysteriously', 'Brooding', 'Doing nothing'
      ];
      for (const actName of dragonsActivities) {
        const res = await client.query('SELECT id FROM dim_social_activity WHERE activity_name = $1', [actName]);
        if (res.rows.length > 0) {
          await mapDimension(client, 'dim_social_activity_body_types', 'activity_id', res.rows[0].id, bodyTypeMap['Dragons'], actName);
        }
      }
    }

    // Mages
    if (bodyTypeMap['Mages']) {
      console.log('\nMages:');
      const magesActivities = [
        'Casting spell', 'Reading spellbook', 'Meditating', 'Brewing potion',
        'Channeling magic', 'Studying runes', 'Conjuring',
        'Reading Poetry', 'Writing', 'Sipping tea', 'Gaming', 'Celebrating', 'Doing nothing'
      ];
      for (const actName of magesActivities) {
        const res = await client.query('SELECT id FROM dim_social_activity WHERE activity_name = $1', [actName]);
        if (res.rows.length > 0) {
          await mapDimension(client, 'dim_social_activity_body_types', 'activity_id', res.rows[0].id, bodyTypeMap['Mages'], actName);
        }
      }
    }

    // Spirits
    if (bodyTypeMap['Spirits']) {
      console.log('\nSpirits:');
      const spiritsActivities = [
        'Casting spell', 'Reading spellbook', 'Meditating', 'Brewing potion',
        'Channeling magic', 'Studying runes', 'Conjuring',
        'Reading Poetry', 'Gazing Mysteriously', 'Writing', 'Brooding',
        'Sipping tea', 'Gaming', 'Celebrating', 'Doing nothing'
      ];
      for (const actName of spiritsActivities) {
        const res = await client.query('SELECT id FROM dim_social_activity WHERE activity_name = $1', [actName]);
        if (res.rows.length > 0) {
          await mapDimension(client, 'dim_social_activity_body_types', 'activity_id', res.rows[0].id, bodyTypeMap['Spirits'], actName);
        }
      }
    }

    // Rangers
    if (bodyTypeMap['Rangers']) {
      console.log('\nRangers:');
      const rangersActivities = [
        'Tracking wildlife', 'Climbing trees', 'Setting up camp', 'Foraging',
        'Scouting ahead', 'Bird watching',
        'Peeking curiously', 'Sipping tea', 'Gaming', 'Watering plants',
        'Planting flowers', 'Relaxing in garden', 'Picking flowers',
        'Road trip', 'Doing nothing'
      ];
      for (const actName of rangersActivities) {
        const res = await client.query('SELECT id FROM dim_social_activity WHERE activity_name = $1', [actName]);
        if (res.rows.length > 0) {
          await mapDimension(client, 'dim_social_activity_body_types', 'activity_id', res.rows[0].id, bodyTypeMap['Rangers'], actName);
        }
      }
    }

    // ========================================================================
    // STEP 6: Map thematic quirks to body types
    // ========================================================================
    console.log('\n6. Mapping thematic quirks to body types...\n');

    // Knights
    if (bodyTypeMap['Knights']) {
      console.log('Knights:');
      const knightsQuirks = [
        'Wearing plume', 'Polished armor', 'Battle scars', 'Heraldic emblem',
        'Has tiny glasses', 'Glows softly', 'No quirk'
      ];
      for (const quirkName of knightsQuirks) {
        const res = await client.query('SELECT id FROM dim_special_quirk WHERE quirk_name = $1', [quirkName]);
        if (res.rows.length > 0) {
          await mapDimension(client, 'dim_special_quirk_body_types', 'quirk_id', res.rows[0].id, bodyTypeMap['Knights'], quirkName);
        }
      }
    }

    // Guardians
    if (bodyTypeMap['Guardians']) {
      console.log('\nGuardians:');
      const guardiansQuirks = [
        'Battle-ready stance', 'Protective aura', 'Watchful eyes',
        'Glows softly', 'Has expressive ears', 'Battle scars', 'No quirk'
      ];
      for (const quirkName of guardiansQuirks) {
        const res = await client.query('SELECT id FROM dim_special_quirk WHERE quirk_name = $1', [quirkName]);
        if (res.rows.length > 0) {
          await mapDimension(client, 'dim_special_quirk_body_types', 'quirk_id', res.rows[0].id, bodyTypeMap['Guardians'], quirkName);
        }
      }
    }

    // Beasts
    if (bodyTypeMap['Beasts']) {
      console.log('\nBeasts:');
      const beastsQuirks = [
        'Wild mane', 'Sharp claws visible', 'Fierce eyes', 'Primal markings',
        'Glows softly', 'Has expressive ears', 'Battle scars', 'No quirk'
      ];
      for (const quirkName of beastsQuirks) {
        const res = await client.query('SELECT id FROM dim_special_quirk WHERE quirk_name = $1', [quirkName]);
        if (res.rows.length > 0) {
          await mapDimension(client, 'dim_special_quirk_body_types', 'quirk_id', res.rows[0].id, bodyTypeMap['Beasts'], quirkName);
        }
      }
    }

    // Dragons
    if (bodyTypeMap['Dragons']) {
      console.log('\nDragons:');
      const dragonsQuirks = [
        'Treasure hoard', 'Smoking nostrils', 'Glittering scales', 'Ancient wisdom',
        'Sparkles when happy', 'Glows softly', 'No quirk'
      ];
      for (const quirkName of dragonsQuirks) {
        const res = await client.query('SELECT id FROM dim_special_quirk WHERE quirk_name = $1', [quirkName]);
        if (res.rows.length > 0) {
          await mapDimension(client, 'dim_special_quirk_body_types', 'quirk_id', res.rows[0].id, bodyTypeMap['Dragons'], quirkName);
        }
      }
    }

    // Mages
    if (bodyTypeMap['Mages']) {
      console.log('\nMages:');
      const magesQuirks = [
        'Floating orb companion', 'Mystical staff', 'Glowing runes', 'Magical aura',
        'Sparkles when happy', 'Has tiny glasses', 'Wears tiny hat', 'Glows softly', 'No quirk'
      ];
      for (const quirkName of magesQuirks) {
        const res = await client.query('SELECT id FROM dim_special_quirk WHERE quirk_name = $1', [quirkName]);
        if (res.rows.length > 0) {
          await mapDimension(client, 'dim_special_quirk_body_types', 'quirk_id', res.rows[0].id, bodyTypeMap['Mages'], quirkName);
        }
      }
    }

    // Spirits
    if (bodyTypeMap['Spirits']) {
      console.log('\nSpirits:');
      const spiritsQuirks = [
        'Floating orb companion', 'Mystical staff', 'Glowing runes', 'Magical aura',
        'Sparkles when happy', 'Has tiny glasses', 'Wears tiny hat', 'Glows softly', 'No quirk'
      ];
      for (const quirkName of spiritsQuirks) {
        const res = await client.query('SELECT id FROM dim_special_quirk WHERE quirk_name = $1', [quirkName]);
        if (res.rows.length > 0) {
          await mapDimension(client, 'dim_special_quirk_body_types', 'quirk_id', res.rows[0].id, bodyTypeMap['Spirits'], quirkName);
        }
      }
    }

    // Rangers
    if (bodyTypeMap['Rangers']) {
      console.log('\nRangers:');
      const rangersQuirks = [
        'Carrying quiver', 'Nature companion', 'Camouflage gear', 'Tracking tools',
        'Has tiny glasses', 'Wears tiny hat', 'Carries tiny bag', 'Has expressive ears', 'No quirk'
      ];
      for (const quirkName of rangersQuirks) {
        const res = await client.query('SELECT id FROM dim_special_quirk WHERE quirk_name = $1', [quirkName]);
        if (res.rows.length > 0) {
          await mapDimension(client, 'dim_special_quirk_body_types', 'quirk_id', res.rows[0].id, bodyTypeMap['Rangers'], quirkName);
        }
      }
    }

    // ========================================================================
    // Summary
    // ========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('✅ Migration 23 completed successfully!');
    console.log('='.repeat(80));
    console.log('\nAll body types now have more thematic activities and quirks!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

console.log('================================================================================');
console.log('Migration 23: Making All Body Types More Thematic');
console.log('================================================================================\n');

runMigration();
