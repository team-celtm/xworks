const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:VbaXdYSYcFkLumAFFWbtRFKPbEyLYIdC@switchyard.proxy.rlwy.net:50984/railway',
  ssl: false
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('Adding new columns to courses table...');
    
    const queries = [
      "ALTER TABLE courses ADD COLUMN IF NOT EXISTS description TEXT;",
      "ALTER TABLE courses ADD COLUMN IF NOT EXISTS short_description VARCHAR(255);",
      "ALTER TABLE courses ADD COLUMN IF NOT EXISTS learning_points JSONB DEFAULT '[]'::jsonb;",
      "ALTER TABLE courses ADD COLUMN IF NOT EXISTS requirements JSONB DEFAULT '[]'::jsonb;",
      "ALTER TABLE courses ADD COLUMN IF NOT EXISTS target_audience JSONB DEFAULT '[]'::jsonb;",
      "ALTER TABLE courses ADD COLUMN IF NOT EXISTS tags_array JSONB DEFAULT '[]'::jsonb;",
      "ALTER TABLE courses ADD COLUMN IF NOT EXISTS thumbnail TEXT;",
      "ALTER TABLE courses ADD COLUMN IF NOT EXISTS preview_video TEXT;",
      "ALTER TABLE courses ADD COLUMN IF NOT EXISTS difficulty VARCHAR(50);",
      "ALTER TABLE courses ADD COLUMN IF NOT EXISTS language VARCHAR(50);",
      "ALTER TABLE courses ADD COLUMN IF NOT EXISTS certificate_enabled BOOLEAN DEFAULT FALSE;",
      "ALTER TABLE courses ADD COLUMN IF NOT EXISTS estimated_completion VARCHAR(50);"
    ];

    for (const q of queries) {
      console.log(`Executing: ${q}`);
      await client.query(q);
    }

    await client.query('COMMIT');
    console.log('Migration completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
