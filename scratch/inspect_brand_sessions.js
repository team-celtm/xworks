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
      SELECT ls.* 
      FROM live_sessions ls 
      JOIN courses c ON ls.course_id = c.id
      WHERE c.slug = 'brand-identity-logo-design'
    `);
    console.log("BRAND SESSIONS:", JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
