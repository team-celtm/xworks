const { Pool } = require('pg');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [k, v] = line.split('=');
  if (k && v) acc[k.trim()] = v.trim();
  return acc;
}, {});

const pool = new Pool({ connectionString: env.DATABASE_URL });

async function test() {
  try {
    const { rows } = await pool.query(`SELECT name FROM courses WHERE name ILIKE '%python%';`);
    console.log(rows);
  } finally {
    pool.end();
  }
}
test();
