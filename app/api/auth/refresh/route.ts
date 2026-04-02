import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { SignJWT, jwtVerify } from 'jose';

const SESSION_SECRET = process.env.SESSION_SECRET || 'your-default-secret-change-me';

export async function POST(req: NextRequest) {
  try {
    // 1. Get refresh token from cookies (or optionally from body/auth header if provided that way)
    const refreshTokenCookie = req.cookies.get('refresh_token')?.value;
    
    // Also allow passing it in the body just in case the frontend relies on explicit passing
    let bodyRefreshToken: string | undefined;
    try {
      const body = await req.json();
      bodyRefreshToken = body.refresh_token;
    } catch {
      // Ignored if body is empty
    }

    const refreshToken = refreshTokenCookie || bodyRefreshToken;

    if (!refreshToken) {
      return NextResponse.json({ error: 'Refresh token is required' }, { status: 401 });
    }

    // 2. Verify the refresh token
    let payload;
    try {
      const verified = await jwtVerify(
        refreshToken,
        new TextEncoder().encode(SESSION_SECRET)
      );
      payload = verified.payload;
    } catch (err) {
      console.error('Refresh token verification failed:', err);
      // Clear invalid cookies
      const response = NextResponse.json({ error: 'Invalid or expired refresh token' }, { status: 401 });
      response.cookies.delete('access_token');
      response.cookies.delete('refresh_token');
      return response;
    }

    if (!payload || typeof payload !== 'object' || !payload.id) {
      return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 });
    }

    const userId = payload.id;
    const tokenVersion = payload.version;

    // 3. Verify user still exists and is active in the database
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    
    if (rows.length === 0) {
      return NextResponse.json({ error: 'User no longer exists' }, { status: 401 });
    }

    const user = rows[0];

    // Check if token was revoked (version mismatch)
    if (tokenVersion && user.refresh_token_version && tokenVersion !== user.refresh_token_version) {
       return NextResponse.json({ error: 'Session was revoked. Please log in again.' }, { status: 401 });
    }

    // Check if user is deleted or suspended
    if (user.deleted_at) {
      return NextResponse.json({ error: 'This account has been deleted' }, { status: 401 });
    }

    if (user.status === 'suspended') {
      return NextResponse.json({ error: 'Your account is suspended. Please contact support.' }, { status: 403 });
    }
    
    if (!user.email_verified) {
      return NextResponse.json({ error: 'Please verify your email address.' }, { status: 403 });
    }

    // 4. Issue a new access token
    const accessToken = await new SignJWT({ 
        id: user.id, 
        email: user.email,
        role: user.role,
        status: user.status
      })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h') 
      .sign(new TextEncoder().encode(SESSION_SECRET));

    const response = NextResponse.json({ 
      message: 'Token refreshed successfully',
      access_token: accessToken,
      user: { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        status: user.status
      }
    }, { status: 200 });

    // 5. Update the access token cookie
    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60, // 1 hour
      path: '/',
    });

    // Optionally update last_active_at
    await pool.query('UPDATE users SET last_active_at = NOW() WHERE id = $1', [user.id]);

    return response;

  } catch (error) {
    console.error('Refresh route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
