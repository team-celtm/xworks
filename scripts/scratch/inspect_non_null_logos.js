const { Pool } = require('pg');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [k, v] = line.split('=');
  if (k && v) acc[k.trim()] = v.trim();
  return acc;
}, {});

const pool = new Pool({
  connectionString: env.DATABASE_URL
});

async function run() {
  try {
    const res = await pool.query("SELECT id, name, slug, logo, emoji FROM courses WHERE logo IS NOT NULL AND logo != ''");
    console.log("NON-NULL LOGO COURSES:", JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
