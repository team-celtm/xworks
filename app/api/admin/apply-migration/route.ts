import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import pool from '@/lib/db';

const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET!
);

async function checkAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SESSION_SECRET);
    if ((payload as any).role !== 'admin') return null;
    return payload as any;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {

  const queries = [
    "ALTER TABLE courses ADD COLUMN IF NOT EXISTS description TEXT;",
    "ALTER TABLE courses ADD COLUMN IF NOT EXISTS short_description VARCHAR(255);",
    "ALTER TABLE courses ADD COLUMN IF NOT EXISTS learning_points JSONB DEFAULT '[]'::jsonb;",
    "ALTER TABLE courses ADD COLUMN IF NOT EXISTS requirements JSONB DEFAULT '[]'::jsonb;",
    "ALTER TABLE courses ADD COLUMN IF NOT EXISTS target_audience JSONB DEFAULT '[]'::jsonb;",
    "ALTER TABLE courses ADD COLUMN IF NOT EXISTS tags_array JSONB DEFAULT '[]'::jsonb;",
    "ALTER TABLE courses ADD COLUMN IF NOT EXISTS thumbnail TEXT;",
    "ALTER TABLE courses ADD COLUMN IF NOT EXISTS preview_video TEXT;",
    "ALTER TABLE courses ADD COLUMN IF NOT EXISTS difficulty VARCHAR(50);",
    "ALTER TABLE courses ADD COLUMN IF NOT EXISTS language VARCHAR(50);",
    "ALTER TABLE courses ADD COLUMN IF NOT EXISTS certificate_enabled BOOLEAN DEFAULT FALSE;",
    "ALTER TABLE courses ADD COLUMN IF NOT EXISTS estimated_completion VARCHAR(100);"
  ];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    for (const q of queries) {
      await client.query(q);
    }

    await client.query('COMMIT');
    return NextResponse.json({ 
      success: true, 
      message: 'Migration applied successfully. New columns have been added.' 
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
