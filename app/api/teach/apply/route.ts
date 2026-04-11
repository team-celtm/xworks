import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { jwtVerify } from 'jose';

const SESSION_SECRET = process.env.SESSION_SECRET || 'your-default-secret-change-me';

export async function POST(req: NextRequest) {
  try {
    const accessToken = req.cookies.get('access_token')?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let payload: any;
    try {
      const { payload: jwtPayload } = await jwtVerify(
        accessToken,
        new TextEncoder().encode(SESSION_SECRET)
      );
      payload = jwtPayload;
    } catch (err) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = payload.id;
    const body = await req.json();
    const { bio, linkedin_url } = body;

    // Check if user is already an instructor or has a pending app
    const checkUser = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
    if (checkUser.rows[0]?.role === 'instructor') {
      return NextResponse.json({ error: 'Already an instructor' }, { status: 400 });
    }

    const existingApp = await pool.query('SELECT status FROM instructor_applications WHERE user_id = $1', [userId]);
    if (existingApp.rows.length > 0) {
      return NextResponse.json({ error: 'Application already exists with status: ' + existingApp.rows[0].status }, { status: 400 });
    }

    await pool.query(
      'INSERT INTO instructor_applications (user_id, bio, linkedin_url, status) VALUES ($1, $2, $3, $4)',
      [userId, bio, linkedin_url, 'pending']
    );

    return NextResponse.json({ message: 'Application submitted successfully' }, { status: 201 });
  } catch (error) {
    console.error('API Error /teach/apply:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
