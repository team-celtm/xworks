const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const client = new Client({
  connectionString: 'postgresql://postgres:WhPdyOSaClhidGXenGElvLRYozVzsFAt@hopper.proxy.rlwy.net:44936/railway'
});

async function run() {
  await client.connect();
  const hash = await bcrypt.hash('Rona@19', 10);
  const email = 'pala.ronith@gmail.com';
  
  const { rows } = await client.query('SELECT id FROM users WHERE email = $1', [email]);
  if (rows.length > 0) {
    await client.query("UPDATE users SET password_hash = $1, role = 'admin', email_verified = true WHERE email = $2", [hash, email]);
    console.log('Updated existing user pala.ronith@gmail.com to Admin.');
  } else {
    // Generate UUID or let DB handle it if type is uuid and has default
    // We can just use gen_random_uuid() 
    await client.query(
      "INSERT INTO users (email, password_hash, role, email_verified) VALUES ($1, $2, 'admin', true)",
      [email, hash]
    );
    console.log('Created new Admin user pala.ronith@gmail.com.');
  }
  await client.end();
}

run().catch(console.error);
