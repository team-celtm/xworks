
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:WhPdyOSaClhidGXenGElvLRYozVzsFAt@hopper.proxy.rlwy.net:44936/railway',
  ssl: false
});

async function verifyUser() {
  try {
    const res = await pool.query('UPDATE users SET email_verified = true WHERE email = $1 RETURNING *', ['test@example.com']);
    console.log('User verified:', res.rows[0]);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

verifyUser();
