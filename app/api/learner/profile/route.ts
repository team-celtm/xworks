import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthId } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const userId = await getAuthId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { rows } = await pool.query(
      'SELECT email, first_name as "firstName", last_name as "lastName", phone, city, preferences FROM users WHERE id = $1',
      [userId]
    );
    if (rows.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json(rows[0]);
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getAuthId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { firstName, lastName, phone, city, preferences } = body;

    await pool.query(
      `UPDATE users 
       SET first_name = $1, last_name = $2, phone = $3, city = $4, preferences = $5 
       WHERE id = $6`,
      [firstName, lastName, phone, city, JSON.stringify(preferences || {}), userId]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Profile update error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
