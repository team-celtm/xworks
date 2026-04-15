const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const dbUrlMatch = env.match(/DATABASE_URL=(.*)/);
const dbUrl = dbUrlMatch ? dbUrlMatch[1].trim() : null;

if (!dbUrl) {
  process.exit(1);
}

const { Client } = require('pg');
const client = new Client({ connectionString: dbUrl });
client.connect()
  .then(() => client.query(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    ORDER BY table_name, ordinal_position;
  `))
  .then(res => { 
    fs.writeFileSync('db_schema.json', JSON.stringify(res.rows, null, 2), 'utf8');
    client.end(); 
  })
  .catch(err => {
    client.end();
  });
