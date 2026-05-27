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
    const checkRes = await pool.query(`
      SELECT i.id, u.email, u.role 
      FROM instructors i 
      JOIN users u ON i.user_id = u.id 
      WHERE u.role != 'instructor'
    `);
    console.log("Stale instructors to delete:", checkRes.rows);

    if (checkRes.rows.length > 0) {
      const deleteRes = await pool.query(`
        DELETE FROM instructors 
        WHERE user_id IN (
          SELECT id FROM users WHERE role != 'instructor'
        )
      `);
      console.log("Deleted rows:", deleteRes.rowCount);
    } else {
      console.log("No stale instructors to delete.");
    }
  } catch (err) {
    console.error("Error deleting stale instructors:", err);
  } finally {
    await pool.end();
  }
}

run();
