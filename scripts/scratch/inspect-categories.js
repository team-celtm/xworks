const fs = require('fs');
const { Pool } = require('pg');

const envContent = fs.readFileSync('.env', 'utf8');
const dbUrlLine = envContent.split('\n').find(line => line.startsWith('DATABASE_URL='));
const connectionString = dbUrlLine.split('DATABASE_URL=')[1].trim();

const pool = new Pool({
  connectionString,
  ssl: false,
});

async function main() {
  const coursesRes = await pool.query(`
    SELECT id, name, slug, status, instructor_id, category_id
    FROM courses
  `);
  console.log('--- COURSES ---');
  console.log(JSON.stringify(coursesRes.rows, null, 2));

  const instructorsRes = await pool.query(`
    SELECT i.id, u.first_name, u.last_name
    FROM instructors i
    JOIN users u ON i.user_id = u.id
  `);
  console.log('--- INSTRUCTORS ---');
  console.log(JSON.stringify(instructorsRes.rows, null, 2));

  await pool.end();
}

main().catch(console.error);
