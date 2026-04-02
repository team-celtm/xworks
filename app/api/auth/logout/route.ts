import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { jwtVerify } from 'jose';

const SESSION_SECRET = process.env.SESSION_SECRET || 'your-default-secret-change-me';

export async function POST(req: NextRequest) {
  try {
    // 1. Get refresh token from cookies to identify the user
    // (Optional: identify via access token if refresh is missing)
    const refreshToken = req.cookies.get('refresh_token')?.value;

    if (refreshToken) {
      try {
        const { payload } = await jwtVerify(
          refreshToken,
          new TextEncoder().encode(SESSION_SECRET)
        );

        if (payload && typeof payload === 'object' && payload.id) {
          // 2. Revoke refresh token by incrementing version
          // This invalidates all current refresh tokens for this user
          await pool.query(
            'UPDATE users SET refresh_token_version = refresh_token_version + 1, last_active_at = NOW() WHERE id = $1',
            [payload.id]
          );
        }
      } catch (err) {
        console.error('Revocation failed or token already invalid:', err);
        // We continue anyway to clear the client state
      }
    }

    // 3. Clear client state (cookies)
    const response = NextResponse.json(
      { message: 'Logged out successfully' },
      { status: 200 }
    );

    response.cookies.delete('access_token');
    response.cookies.delete('refresh_token');

    return response;

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
