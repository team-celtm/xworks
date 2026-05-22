const { Pool } = require('pg');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [k, v] = line.split('=');
  if (k && v) acc[k.trim()] = v.trim();
  return acc;
}, {});

const pool = new Pool({ connectionString: env.DATABASE_URL });

async function migrate() {
  try {
    await pool.query('BEGIN');
    console.log('Running payments migration...');

    await pool.query(`
      ALTER TABLE payments
      ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
      ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30),
      ADD COLUMN IF NOT EXISTS gateway_fee NUMERIC(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS net_amount NUMERIC(10,2),
      ADD COLUMN IF NOT EXISTS failed_reason TEXT,
      ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS webhook_verified BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS metadata JSONB;
    `);
    console.log('Added new columns to payments table.');

    // Normalize existing status
    await pool.query(`
      UPDATE payments 
      SET payment_status = status 
      WHERE payment_status IS NULL;
    `);
    console.log('Normalized existing payment statuses.');

    // Create Audit Log table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_audit_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          payment_id INTEGER REFERENCES payments(id),
          action VARCHAR(100),
          performed_by UUID REFERENCES users(id),
          old_data JSONB,
          new_data JSONB,
          created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Created payment_audit_logs table.');

    // Create Webhook Log table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_webhook_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          event_type TEXT,
          payload JSONB,
          status TEXT,
          created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Created payment_webhook_logs table.');

    await pool.query('COMMIT');
    console.log('Migration completed successfully.');
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}

migrate();
