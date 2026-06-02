const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:VbaXdYSYcFkLumAFFWbtRFKPbEyLYIdC@switchyard.proxy.rlwy.net:50984/railway";
const pool = new Pool({ connectionString });

async function dump() {
  const tables = ['live_sessions', 'session_registrations', 'enrolments', 'courses', 'instructors', 'users'];
  for (const table of tables) {
    try {
      const res = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1;
      `, [table]);
      console.log(`\nTable: ${table}`);
      res.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));
    } catch (e) {
      console.error(`Error fetching table ${table}:`, e.message);
    }
  }
  await pool.end();
}
dump();
