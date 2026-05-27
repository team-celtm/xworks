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
    const q1 = await pool.query(`SELECT COUNT(*) FROM instructors`);
    console.log("COUNT FROM instructors table:", q1.rows[0].count);

    const q2 = await pool.query(`SELECT COUNT(*) FROM instructors i JOIN users u ON i.user_id = u.id WHERE u.role = 'instructor'`);
    console.log("COUNT joined with active instructor role:", q2.rows[0].count);

    const q3 = await pool.query(`SELECT COUNT(*) FROM users WHERE role = 'instructor'`);
    console.log("COUNT from users table with role 'instructor':", q3.rows[0].count);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
