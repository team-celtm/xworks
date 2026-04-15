const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const dbUrlMatch = env.match(/DATABASE_URL=(.*)/);
const dbUrl = dbUrlMatch ? dbUrlMatch[1].trim() : null;

if (!dbUrl) {
  console.error("DATABASE_URL not found");
  process.exit(1);
}

const { Client } = require('pg');
const client = new Client({ connectionString: dbUrl });

const sql = `
  ALTER TABLE courses ADD COLUMN IF NOT EXISTS status character varying DEFAULT 'draft';

  CREATE TABLE IF NOT EXISTS instructor_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending',
    bio TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
`;

client.connect()
  .then(() => client.query(sql))
  .then(() => {
    console.log('Database migrated successfully.');
    client.end();
  })
  .catch(err => {
    console.error('Migration error:', err);
    client.end();
    process.exit(1);
  });
