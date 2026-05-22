const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'payments'");
  console.log(res.rows);
  process.exit(0);
}
run();
