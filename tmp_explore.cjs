const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    const users = await pool.query('SELECT id, email, role, first_name FROM users LIMIT 10');
    console.log('USERS:', JSON.stringify(users.rows, null, 2));

    const sessions = await pool.query(`
      SELECT ls.id, ls.title, ls.course_id, ls.status, ls.recording_available, c.name as course_name
      FROM live_sessions ls
      JOIN courses c ON ls.course_id = c.id
      LIMIT 10
    `);
    console.log('SESSIONS:', JSON.stringify(sessions.rows, null, 2));

    const enrolments = await pool.query(`
      SELECT e.id, e.user_id, e.course_id, u.email as user_email, c.name as course_name
      FROM enrolments e
      JOIN users u ON e.user_id = u.id
      JOIN courses c ON e.course_id = c.id
      LIMIT 10
    `);
    console.log('ENROLMENTS:', JSON.stringify(enrolments.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
