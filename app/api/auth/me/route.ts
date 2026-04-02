import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { jwtVerify } from 'jose';

const SESSION_SECRET = process.env.SESSION_SECRET || 'your-default-secret-change-me';

export async function GET(req: NextRequest) {
  try {
    const accessToken = req.cookies.get('access_token')?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify JWT
    let payload: any;
    try {
      const { payload: jwtPayload } = await jwtVerify(
        accessToken,
        new TextEncoder().encode(SESSION_SECRET)
      );
      payload = jwtPayload;
    } catch (err) {
      console.error('JWT verification failed:', err);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = payload.id;

    // Fetch user details
    const { rows } = await pool.query(
      'SELECT id, email, first_name as "firstName", last_name as "lastName", display_name as "displayName", avatar_url as "avatarUrl", role, status, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(rows[0], { status: 200 });
  } catch (error) {
    console.error('API Error /auth/me:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
