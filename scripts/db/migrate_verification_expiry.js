const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:VbaXdYSYcFkLumAFFWbtRFKPbEyLYIdC@switchyard.proxy.rlwy.net:50984/railway'
});

async function main() {
  try {
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS verification_token_expires_at TIMESTAMP WITH TIME ZONE;
    `);
    console.log('verification_token_expires_at column added successfully');
  } catch (error) {
    console.error('Error adding column:', error);
  } finally {
    await pool.end();
  }
}
main();
