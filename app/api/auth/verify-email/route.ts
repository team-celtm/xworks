import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Missing verification token' }, { status: 400 });
    }

    // Find user with this token
    const { rows } = await pool.query('SELECT id FROM users WHERE verification_token = $1', [token]);
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 404 });
    }

    const userId = rows[0].id;

    // Update user to be verified and active
    await pool.query(
      "UPDATE users SET email_verified = TRUE, status = 'active', verification_token = NULL WHERE id = $1", 
      [userId]
    );

    // Redirect to login or success page
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${baseUrl}/Login?verified=true`);

  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
