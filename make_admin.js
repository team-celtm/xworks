const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:WhPdyOSaClhidGXenGElvLRYozVzsFAt@hopper.proxy.rlwy.net:44936/railway'
});

async function run() {
  await client.connect();
  const res = await client.query("UPDATE users SET role = 'admin' RETURNING email");
  console.log("Updated users to admin:", res.rows.map(r => r.email));
  await client.end();
}

run().catch(console.error);
