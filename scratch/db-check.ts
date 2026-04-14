import pool from '../lib/db';

async function check() {
  try {
    const { rows } = await pool.query("SELECT count(*) FROM users");
    console.log("Users count:", rows[0].count);
    
    const { rows: certs } = await pool.query("SELECT count(*) FROM certificates");
    console.log("Certs count:", certs[0].count);
  } catch (e: any) {
    console.error("Error checking DB:", e.message);
  } finally {
    process.exit();
  }
}

check();
