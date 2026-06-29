const { Client } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const dbUrl = env.split('\n').find(line => line.startsWith('DATABASE_URL')).split('=')[1].replace(/"/g, '').replace(/'/g, '').trim();

async function checkDb() {
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const res = await client.query(`
      SELECT pid, state, query 
      FROM pg_stat_activity 
      WHERE state = 'active' OR state = 'idle in transaction'
    `);
    console.log(res.rows);
  } catch (e) {
    console.error('Error:', e.message);
  }
  await client.end();
}
checkDb();
