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
      SELECT ls.*, c.name as course_name 
      FROM live_sessions ls 
      JOIN courses c ON ls.course_id = c.id
    `);
    console.log("LIVE SESSIONS IN DB:", JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
