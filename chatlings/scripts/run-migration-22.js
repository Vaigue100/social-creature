/**
 * Migration 22: Fix Athlete dimensions to be more athletic
 * - Add new athletic activities (jogging, exercising, etc.)
 * - Add new athletic quirks (headband, sweatband, water bottle, etc.)
 * - Remove non-athletic activities from Athletes (coffee, gaming)
 * - Remove non-athletic quirks from Athletes (phone, blanket)
 */

const { Client } = require('pg');
const config = { ...require('./db-config'), database: 'chatlings' };

async function runMigration() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Migration 22: Making Athletes more athletic\n');
    console.log('='.repeat(80));

    // Step 1: Add new athletic activities
    console.log('\n1. Adding new athletic activities...');

    const newActivities = [
      ['Jogging outdoors', 'jogging outdoors with athletic pose, running motion'],
      ['Doing pushups', 'doing pushups with determined expression, exercise pose'],
      ['Jumping rope', 'jumping rope with energetic motion, cardio workout'],
      ['Doing sit-ups', 'doing sit-ups with focused expression, core workout'],
      ['Wearing headband', 'wearing athletic headband, ready for action pose'],
      ['Stretching warmup', 'doing warmup stretches, athletic preparation pose'],
      ['High-fiving', 'giving enthusiastic high-five, team spirit pose'],
      ['Sprint running', 'sprinting with speed lines, intense running pose'],
      ['Doing lunges', 'doing lunges with proper form, leg workout pose']
    ];

    for (const [name, prompt] of newActivities) {
      const existing = await client.query(`
        SELECT id FROM dim_social_activity WHERE activity_name = $1
      `, [name]);

      if (existing.rows.length === 0) {
        await client.query(`
          INSERT INTO dim_social_activity (activity_name, prompt_text)
          VALUES ($1, $2)
        `, [name, prompt]);
        console.log(`  ✓ Added: ${name}`);
      } else {
        console.log(`  - Already exists: ${name}`);
      }
    }

    // Step 2: Add new athletic quirks
    console.log('\n2. Adding new athletic quirks...');

    const newQuirks = [
      ['Wearing headband', 'wearing athletic headband'],
      ['Wearing sweatband', 'wearing wrist sweatbands'],
      ['Wearing sports watch', 'wearing fitness tracker watch'],
      ['Carrying water bottle', 'carrying sports water bottle'],
      ['Wearing athletic tape', 'wearing athletic tape on joints'],
      ['With gym towel', 'carrying gym towel around neck'],
      ['Wearing medal', 'wearing achievement medal proudly']
    ];

    for (const [name, prompt] of newQuirks) {
      const existing = await client.query(`
        SELECT id FROM dim_special_quirk WHERE quirk_name = $1
      `, [name]);

      if (existing.rows.length === 0) {
        await client.query(`
          INSERT INTO dim_special_quirk (quirk_name, prompt_text)
          VALUES ($1, $2)
        `, [name, prompt]);
        console.log(`  ✓ Added: ${name}`);
      } else {
        console.log(`  - Already exists: ${name}`);
      }
    }

    // Step 3: Get Athletes body_type_id
    const athleteResult = await client.query(`
      SELECT id FROM dim_body_type WHERE body_type_name = 'Athletes'
    `);

    if (athleteResult.rows.length === 0) {
      throw new Error('Athletes body type not found!');
    }

    const athleteId = athleteResult.rows[0].id;
    console.log(`\n3. Found Athletes body_type_id: ${athleteId}`);

    // Step 4: Remove non-athletic activities from Athletes
    console.log('\n4. Removing non-athletic activities from Athletes...');

    const nonAthleticActivities = ['Sipping coffee', 'Gaming'];

    for (const activityName of nonAthleticActivities) {
      const result = await client.query(`
        DELETE FROM dim_social_activity_body_types
        WHERE body_type_id = $1
          AND activity_id IN (
            SELECT id FROM dim_social_activity WHERE activity_name = $2
          )
      `, [athleteId, activityName]);
      console.log(`  ✓ Removed: ${activityName} (${result.rowCount} rows)`);
    }

    // Step 5: Remove non-athletic quirks from Athletes
    console.log('\n5. Removing non-athletic quirks from Athletes...');

    const nonAthleticQuirks = ['Holding phone', 'With comfort blanket'];

    for (const quirkName of nonAthleticQuirks) {
      const result = await client.query(`
        DELETE FROM dim_special_quirk_body_types
        WHERE body_type_id = $1
          AND quirk_id IN (
            SELECT id FROM dim_special_quirk WHERE quirk_name = $2
          )
      `, [athleteId, quirkName]);
      console.log(`  ✓ Removed: ${quirkName} (${result.rowCount} rows)`);
    }

    // Step 6: Add new athletic activities to Athletes
    console.log('\n6. Mapping new athletic activities to Athletes...');

    const athleticActivitiesToAdd = [
      'Jogging outdoors',
      'Doing pushups',
      'Jumping rope',
      'Doing sit-ups',
      'Stretching warmup',
      'High-fiving',
      'Sprint running',
      'Doing lunges',
      // Also keep existing good ones and ensure they're there
      'Lifting weights',
      'Running on treadmill',
      'Doing yoga',
      'Stretching at gym',
      'Playing soccer',
      'Playing basketball',
      'Swimming',
      'Playing tennis',
      'Celebrating',
      'Dancing to music',
      'Doing nothing'
    ];

    for (const activityName of athleticActivitiesToAdd) {
      const activityResult = await client.query(`
        SELECT id FROM dim_social_activity WHERE activity_name = $1
      `, [activityName]);

      if (activityResult.rows.length > 0) {
        const activityId = activityResult.rows[0].id;
        const existing = await client.query(`
          SELECT 1 FROM dim_social_activity_body_types
          WHERE activity_id = $1 AND body_type_id = $2
        `, [activityId, athleteId]);

        if (existing.rows.length === 0) {
          await client.query(`
            INSERT INTO dim_social_activity_body_types (activity_id, body_type_id)
            VALUES ($1, $2)
          `, [activityId, athleteId]);
          console.log(`  ✓ Mapped: ${activityName}`);
        } else {
          console.log(`  - Already mapped: ${activityName}`);
        }
      }
    }

    // Step 7: Add new athletic quirks to Athletes
    console.log('\n7. Mapping new athletic quirks to Athletes...');

    const athleticQuirksToAdd = [
      'Wearing headband',
      'Wearing sweatband',
      'Wearing sports watch',
      'Carrying water bottle',
      'Wearing athletic tape',
      'With gym towel',
      'Wearing medal',
      // Keep the good existing ones
      'Wearing headphones',
      'Has tiny glasses',
      'No quirk'
    ];

    for (const quirkName of athleticQuirksToAdd) {
      const quirkResult = await client.query(`
        SELECT id FROM dim_special_quirk WHERE quirk_name = $1
      `, [quirkName]);

      if (quirkResult.rows.length > 0) {
        const quirkId = quirkResult.rows[0].id;
        const existing = await client.query(`
          SELECT 1 FROM dim_special_quirk_body_types
          WHERE quirk_id = $1 AND body_type_id = $2
        `, [quirkId, athleteId]);

        if (existing.rows.length === 0) {
          await client.query(`
            INSERT INTO dim_special_quirk_body_types (quirk_id, body_type_id)
            VALUES ($1, $2)
          `, [quirkId, athleteId]);
          console.log(`  ✓ Mapped: ${quirkName}`);
        } else {
          console.log(`  - Already mapped: ${quirkName}`);
        }
      }
    }

    // Step 8: Show final Athletes mappings
    console.log('\n' + '='.repeat(80));
    console.log('8. Final Athletes mappings:');
    console.log('='.repeat(80));

    const finalActivities = await client.query(`
      SELECT sa.activity_name
      FROM dim_social_activity sa
      JOIN dim_social_activity_body_types sabt ON sa.id = sabt.activity_id
      WHERE sabt.body_type_id = $1
      ORDER BY sa.activity_name
    `, [athleteId]);

    console.log(`\nAthletes Activities (${finalActivities.rows.length}):`);
    finalActivities.rows.forEach(a => console.log(`  - ${a.activity_name}`));

    const finalQuirks = await client.query(`
      SELECT sq.quirk_name
      FROM dim_special_quirk sq
      JOIN dim_special_quirk_body_types sqbt ON sq.id = sqbt.quirk_id
      WHERE sqbt.body_type_id = $1
      ORDER BY sq.quirk_name
    `, [athleteId]);

    console.log(`\nAthletes Quirks (${finalQuirks.rows.length}):`);
    finalQuirks.rows.forEach(q => console.log(`  - ${q.quirk_name}`));

    console.log('\n' + '='.repeat(80));
    console.log('✅ Migration 22 completed successfully!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

console.log('================================================================================');
console.log('Migration 22: Making Athletes More Athletic');
console.log('================================================================================\n');

runMigration();
