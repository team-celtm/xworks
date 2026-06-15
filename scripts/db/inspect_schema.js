const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:VbaXdYSYcFkLumAFFWbtRFKPbEyLYIdC@switchyard.proxy.rlwy.net:50984/railway'
});

async function main() {
  try {
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    for (const row of tablesRes.rows) {
      const tableName = row.table_name;
      console.log(`\nTable: ${tableName}`);
      const columnsRes = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1
      `, [tableName]);
      for (const col of columnsRes.rows) {
        console.log(`  - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
main();
