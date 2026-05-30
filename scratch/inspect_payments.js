const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    const statusRes = await pool.query('SELECT status, payment_status, COUNT(*) FROM payments GROUP BY status, payment_status');
    console.log("Payments statuses:");
    console.log(statusRes.rows);

    const refundRes = await pool.query('SELECT status, COUNT(*) FROM refund_events GROUP BY status');
    console.log("Refund event statuses:");
    console.log(refundRes.rows);

    const instructorRes = await pool.query('SELECT status, COUNT(*) FROM users GROUP BY status');
    console.log("User statuses:");
    console.log(instructorRes.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
