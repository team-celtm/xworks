const { Pool } = require('pg');
// require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:VbaXdYSYcFkLumAFFWbtRFKPbEyLYIdC@switchyard.proxy.rlwy.net:50984/railway'
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('Creating payment_webhooks...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS payment_webhooks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id VARCHAR(255) UNIQUE NOT NULL,
        gateway VARCHAR(50) NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        payload JSONB NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        error_msg TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP WITH TIME ZONE
      );
    `);

    console.log('Creating failed_payment_logs...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS failed_payment_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
        amount DECIMAL(10, 2) NOT NULL,
        gateway_error_code VARCHAR(100),
        gateway_error_desc TEXT,
        failure_category VARCHAR(100),
        ip_address VARCHAR(45),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Creating refund_events...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS refund_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        payment_id INTEGER REFERENCES payments(id) ON DELETE CASCADE,
        amount DECIMAL(10, 2) NOT NULL,
        reason_category VARCHAR(100),
        status VARCHAR(50) DEFAULT 'requested',
        dispute_notes TEXT,
        evidence_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Creating fraud_flags...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS fraud_flags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        payment_id INTEGER REFERENCES payments(id) ON DELETE CASCADE,
        risk_score INTEGER,
        flags JSONB,
        ip_address VARCHAR(45),
        device_id VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Creating admin_sessions...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id UUID REFERENCES users(id) ON DELETE CASCADE,
        ip_address VARCHAR(45),
        user_agent TEXT,
        status VARCHAR(50) DEFAULT 'active',
        login_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        logout_time TIMESTAMP WITH TIME ZONE
      );
    `);

    console.log('Creating analytics_cache...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS analytics_cache (
        cache_key VARCHAR(255) PRIMARY KEY,
        data JSONB NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Enhancing audit_logs (checking if exists)...');
    const auditRes = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'audit_logs'
      );
    `);
    
    if (!auditRes.rows[0].exists) {
      await client.query(`
        CREATE TABLE audit_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
          action VARCHAR(255) NOT NULL,
          entity_type VARCHAR(100),
          entity_id UUID,
          changes JSONB,
          ip_address VARCHAR(45),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } else {
       // Check if ip_address exists on audit_logs
       const ipCol = await client.query(`
         SELECT column_name 
         FROM information_schema.columns 
         WHERE table_name='audit_logs' and column_name='ip_address';
       `);
       if (ipCol.rowCount === 0) {
         await client.query('ALTER TABLE audit_logs ADD COLUMN ip_address VARCHAR(45);');
       }
    }

    await client.query('COMMIT');
    console.log('Migration completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
