const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool();
async function run() {
  try {
    const res = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name IN ('payments', 'enrolments')
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } finally {
    await pool.end();
  }
}
run();
