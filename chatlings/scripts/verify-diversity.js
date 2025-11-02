const { Client } = require('pg');
const config = { ...require('./db-config'), database: 'chatlings' };

(async () => {
  const client = new Client(config);
  await client.connect();

  console.log('=== MOOD DISTRIBUTION ===');
  const moods = await client.query(`
    SELECT m.mood_name, COUNT(*) as count
    FROM creatures c
    JOIN dim_mood m ON c.mood_id = m.id
    GROUP BY m.mood_name
    ORDER BY count DESC LIMIT 10
  `);
  moods.rows.forEach(r => console.log(`  ${r.mood_name}: ${r.count}`));

  console.log('\n=== COLOR DISTRIBUTION ===');
  const colors = await client.query(`
    SELECT co.colouring_name, COUNT(*) as count
    FROM creatures c
    JOIN dim_colouring co ON c.colouring_id = co.id
    GROUP BY co.colouring_name
    ORDER BY count DESC LIMIT 10
  `);
  colors.rows.forEach(r => console.log(`  ${r.colouring_name}: ${r.count}`));

  console.log('\n=== SUBSPECIES DISTRIBUTION (Top 15) ===');
  const subs = await client.query(`
    SELECT s.subspecies_name, COUNT(*) as count
    FROM creatures c
    JOIN dim_subspecies s ON c.subspecies_id = s.id
    GROUP BY s.subspecies_name
    ORDER BY count DESC LIMIT 15
  `);
  subs.rows.forEach(r => console.log(`  ${r.subspecies_name}: ${r.count}`));

  console.log('\n=== SAMPLE CREATURES (Random 10) ===');
  const samples = await client.query(`
    SELECT c.creature_name, s.subspecies_name, co.colouring_name, m.mood_name
    FROM creatures c
    JOIN dim_subspecies s ON c.subspecies_id = s.id
    JOIN dim_colouring co ON c.colouring_id = co.id
    JOIN dim_mood m ON c.mood_id = m.id
    ORDER BY RANDOM()
    LIMIT 10
  `);
  samples.rows.forEach(r => console.log(`  ${r.creature_name}`));

  console.log('\n=== TOTAL CREATURES ===');
  const total = await client.query('SELECT COUNT(*) FROM creatures');
  console.log(`  ${total.rows[0].count} total creatures`);

  await client.end();
})();
