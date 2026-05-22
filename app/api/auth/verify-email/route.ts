import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getBaseUrl } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Missing verification token' }, { status: 400 });
    }

    // Find user with this token
    const { rows } = await pool.query('SELECT id, preferences FROM users WHERE verification_token = $1', [token]);
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 404 });
    }

    const user = rows[0];
    const userId = user.id;
    const pendingPasswordHash = user.preferences?.pending_password_hash;

    // Update user to be verified and active, and migrate pending password hash if present
    if (pendingPasswordHash) {
      await pool.query(
        `UPDATE users 
         SET email_verified = TRUE, 
             status = 'active', 
             password_hash = $2, 
             preferences = preferences - 'pending_password_hash', 
             verification_token = NULL 
         WHERE id = $1`, 
        [userId, pendingPasswordHash]
      );
    } else {
      await pool.query(
        "UPDATE users SET email_verified = TRUE, status = 'active', verification_token = NULL WHERE id = $1", 
        [userId]
      );
    }

    // Redirect to login or success page
    const baseUrl = getBaseUrl(req);
    return NextResponse.redirect(`${baseUrl}/Login?verified=true`);

  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
