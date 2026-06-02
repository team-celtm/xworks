import pool from '../lib/db';

async function updateDb() {
  try {
    console.log('Altering courses table to set live DEFAULT true...');
    await pool.query('ALTER TABLE courses ALTER COLUMN live SET DEFAULT true');
    
    console.log('Updating all existing courses to live = true...');
    await pool.query('UPDATE courses SET live = true');
    
    console.log('Update successful.');
  } catch (err) {
    console.error('Error updating db:', err);
  } finally {
    await pool.end();
  }
}

updateDb();
