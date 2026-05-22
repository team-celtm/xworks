const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Manually parse .env file
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      process.env[key] = val;
    }
  });
}


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    console.log('--- COURSES TABLE COLUMNS ---');
    let res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'courses'");
    console.log(res.rows);

    console.log('--- ENROLMENTS TABLE COLUMNS ---');
    res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'enrolments'");
    console.log(res.rows);

    console.log('--- FORMAT VALUES IN ENROLMENTS ---');
    res = await pool.query("SELECT DISTINCT format FROM enrolments");
    console.log(res.rows);

    console.log('--- COURSES SAMPLE DATA ---');
    res = await pool.query("SELECT id, name, live, nearby FROM courses LIMIT 5");
    console.log(res.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
