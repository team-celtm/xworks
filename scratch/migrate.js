const fs = require('fs');
const { Pool } = require('pg');

const envFile = fs.readFileSync('.env', 'utf8');
const lines = envFile.split('\n');
let dbUrl = '';
for (const line of lines) {
  if (line.startsWith('DATABASE_URL=')) {
    dbUrl = line.split('=')[1].trim().replace(/^"|"$/g, '');
    break;
  }
}

const pool = new Pool({ connectionString: dbUrl });

async function migrate() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS session_attendance (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        session_id UUID REFERENCES live_sessions(id),
        user_id UUID REFERENCES users(id),
        join_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        leave_time TIMESTAMP WITH TIME ZONE,
        duration_seconds INTEGER DEFAULT 0,
        device_info TEXT,
        browser_info TEXT,
        status VARCHAR(50) DEFAULT 'joined'
      );
    `);
    
    // Add columns to session_registrations if not exists
    await pool.query(`
      ALTER TABLE session_registrations
      ADD COLUMN IF NOT EXISTS attendance_status VARCHAR(50) DEFAULT 'enrolled',
      ADD COLUMN IF NOT EXISTS completion_pct INTEGER DEFAULT 0;
    `);

    console.log("Migration successful!");
  } catch(e) {
    console.error("Migration failed:", e);
  } finally {
    await pool.end();
  }
}

migrate();
