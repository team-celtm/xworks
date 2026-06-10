const { Pool } = require('pg');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Parse .env file manually
let dbUrl = '';
try {
  const envFile = fs.readFileSync('.env', 'utf8');
  for (const line of envFile.split('\n')) {
    if (line.startsWith('DATABASE_URL=')) {
      dbUrl = line.split('=')[1].trim().replace(/^"|"$/g, '');
      break;
    }
  }
} catch (err) {
  console.error('Failed to read .env file:', err);
}

if (!dbUrl) {
  console.error('DATABASE_URL not found in .env');
  process.exit(1);
}

const pool = new Pool({ connectionString: dbUrl });

async function run() {
  console.log('=== RUNNING DATABASE FIXES AND SEEDING ===');
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Drop the constraint if it exists and add updated constraint with 'expired'
    console.log('Updating check constraint live_sessions_status_check...');
    
    // Drop constraint (check if it exists first, or drop directly as pg allows IF EXISTS since 9.0)
    await client.query(`
      ALTER TABLE live_sessions 
      DROP CONSTRAINT IF EXISTS live_sessions_status_check
    `);
    
    // Add constraint with 'expired' status included
    await client.query(`
      ALTER TABLE live_sessions
      ADD CONSTRAINT live_sessions_status_check 
      CHECK (status::text = ANY (ARRAY[
        'scheduled'::text, 
        'live'::text, 
        'completed'::text, 
        'cancelled'::text, 
        'postponed'::text,
        'expired'::text
      ]))
    `);
    
    console.log('Successfully updated constraint live_sessions_status_check to support "expired" status.');
    
    // 2. Create the admin user
    const email = 'admin@xworks.com';
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log('Upserting admin user...');
    await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role, status, email_verified)
      VALUES ($1, $2, 'Admin', 'User', 'admin', 'active', true)
      ON CONFLICT (email) DO UPDATE 
      SET password_hash = EXCLUDED.password_hash,
          role = 'admin',
          status = 'active',
          email_verified = true
    `, [email, hashedPassword]);
    
    console.log(`Successfully created/updated admin user: ${email} with password: ${password}`);
    
    await client.query('COMMIT');
    console.log('=== DATABASE FIXES COMPLETED SUCCESSFULLY ===');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration/Seeding failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
