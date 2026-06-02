const { Pool } = require('pg');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [k, v] = line.split('=');
  if (k && v) acc[k.trim()] = v.trim();
  return acc;
}, {});

const pool = new Pool({ connectionString: env.DATABASE_URL });

async function run() {
  try {
    const res = await pool.query(`
      SELECT c.id, c.name, c.slug, COUNT(ls.id) as session_count
      FROM courses c
      LEFT JOIN live_sessions ls ON c.id = ls.course_id
      GROUP BY c.id, c.name, c.slug
      ORDER BY session_count DESC
    `);
    console.log("COURSES AND THEIR SESSION COUNTS:", JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
