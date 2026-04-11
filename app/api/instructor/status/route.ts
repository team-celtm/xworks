import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import pool from '@/lib/db';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback_secret_for_development'
);

const SESSION_SECRET = process.env.SESSION_SECRET || 'your-default-secret-change-me';

async function getUser(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(SESSION_SECRET));
    return payload as any;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await pool.query(
      `SELECT status FROM instructor_applications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ application_status: 'none' });
    }

    return NextResponse.json({ application_status: result.rows[0].status });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user || user.role !== 'instructor') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { bio, linkedin_url } = body;

    const existingId = await pool.query(`SELECT id FROM instructor_applications WHERE user_id = $1`, [user.id]);
    if (existingId.rows.length > 0) {
      return NextResponse.json({ error: 'Application already exists' }, { status: 400 });
    }

    await pool.query(
      `INSERT INTO instructor_applications (user_id, bio, linkedin_url, status) VALUES ($1, $2, $3, $4)`,
      [user.id, bio, linkedin_url, 'pending']
    );

    return NextResponse.json({ success: true, message: 'Application submitted for review.' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
