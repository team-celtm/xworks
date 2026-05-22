import 'dotenv/config';
import pool from './lib/db';
async function test() {
  const { rows } = await pool.query('SELECT * FROM courses LIMIT 1');
  console.log(rows);
  pool.end();
}
test();
