const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:VbaXdYSYcFkLumAFFWbtRFKPbEyLYIdC@switchyard.proxy.rlwy.net:50984/railway'
});

async function main() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payout_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        instructor_id UUID NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
        amount_paise BIGINT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'Requested',
        bank_details JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('payout_requests table created successfully');
  } catch (error) {
    console.error('Error creating table:', error);
  } finally {
    await pool.end();
  }
}
main();
