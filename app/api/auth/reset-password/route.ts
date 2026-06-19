import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { isRateLimited } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests. Please try again in 15 minutes.' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const token = body.token;
    const newPassword = body.newPassword || body.password;

    if (!token || !newPassword) {
      return NextResponse.json({ error: 'Token and new password are required' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
    }

    const { rows } = await pool.query(
      'SELECT id FROM users WHERE reset_password_token = $1 AND reset_password_expires_at > NOW() AND status = $2', 
      [token, 'active']
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired password reset link' }, { status: 400 });
    }

    const userId = rows[0].id;

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password, clear the reset token, and increment the refresh token version to revoke existing sessions (BUG-016)
    await pool.query(
      `UPDATE users 
       SET password_hash = $1, 
           reset_password_token = NULL, 
           reset_password_expires_at = NULL, 
           refresh_token_version = COALESCE(refresh_token_version, 1) + 1 
       WHERE id = $2`,
      [hashedPassword, userId]
    );

    return NextResponse.json({ message: 'Password has been successfully updated' });

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
