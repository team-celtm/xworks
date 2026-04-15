const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:WhPdyOSaClhidGXenGElvLRYozVzsFAt@hopper.proxy.rlwy.net:44936/railway'
});

async function run() {
  await client.connect();
  
  // Set everyone's role to 'learner' except the single real admin
  const res = await client.query(
    "UPDATE users SET role = 'learner' WHERE email != 'pala.ronith@gmail.com' RETURNING email"
  );
  
  console.log(`Reverted ${res.rowCount} users back to learner role.`);
  await client.end();
}

run().catch(console.error);
