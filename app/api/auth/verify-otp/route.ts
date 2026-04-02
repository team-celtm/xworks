import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Find user by email and otp
    const { rows } = await pool.query(
        'SELECT id, otp, otp_expires_at FROM users WHERE email = $1', 
        [email]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = rows[0];

    // Check OTP match
    if (user.otp !== otp) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
    }

    // Check expiration
    const now = new Date();
    if (new Date(user.otp_expires_at) < now) {
      return NextResponse.json({ error: 'Verification code expired. Please request a new one.' }, { status: 400 });
    }

    // Update user to verified and active
    await pool.query(
      "UPDATE users SET email_verified = TRUE, status = 'active', otp = NULL, otp_expires_at = NULL WHERE id = $1", 
      [user.id]
    );

    return NextResponse.json({ 
        message: 'Email verified successfully! You can now log in.', 
        success: true 
    }, { status: 200 });

  } catch (error) {
    console.error('OTP Verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
