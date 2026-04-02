import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { SignJWT } from 'jose';

const SESSION_SECRET = process.env.SESSION_SECRET || 'your-default-secret-change-me';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'Auth code not found' }, { status: 400 });
  }

  try {
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const REDIRECT_URI = `${BASE_URL}/api/auth/google/callback`;

    // 1. Exchange code for access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error('Google token error:', tokenData);
      return NextResponse.json({ error: 'Failed to exchange token' }, { status: 400 });
    }

    // 2. Fetch user info from Google
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const googleUser = await userRes.json();
    if (!googleUser.email) {
      return NextResponse.json({ error: 'Email not provided by Google' }, { status: 400 });
    }

    // 3. Upsert User in Database
    // Check if user exists by google_id
    const { rows: existingByGoogle } = await pool.query('SELECT * FROM users WHERE google_id = $1', [googleUser.id]);
    
    let user;

    let successType: 'signin' | 'signup' = 'signin';

    if (existingByGoogle.length > 0) {
      user = existingByGoogle[0];
      successType = 'signin';
      // Update last active
      await pool.query('UPDATE users SET last_active_at = NOW() WHERE id = $1', [user.id]);
    } else {
      // Check if user exists by email (to link account)
      const { rows: existingByEmail } = await pool.query('SELECT * FROM users WHERE email = $1', [googleUser.email]);
      
      if (existingByEmail.length > 0) {
        user = existingByEmail[0];
        successType = 'signin'; // Linking an existing email account counts as sign-in
        // Link google_id and update status
        await pool.query(
          'UPDATE users SET google_id = $1, email_verified = true, status = $2, avatar_url = $3, display_name = $4, last_active_at = NOW() WHERE id = $5',
          [googleUser.id, 'active', googleUser.picture, googleUser.name, user.id]
        );
      } else {
        // Prevent registration via Google, but pass along info.
        const redirectUrl = new URL(`${BASE_URL}/Login`);
        redirectUrl.searchParams.set('error', 'google_signup_disabled');
        if (googleUser.email) redirectUrl.searchParams.set('email', googleUser.email);
        if (googleUser.given_name) redirectUrl.searchParams.set('firstName', googleUser.given_name);
        if (googleUser.family_name) redirectUrl.searchParams.set('lastName', googleUser.family_name);
        
        return NextResponse.redirect(redirectUrl.toString());
      }
    }

    // 4. Issue Tokens and Set Cookies
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

    const refreshToken = await new SignJWT({
        id: user.id,
        version: user.refresh_token_version || 1
      })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d') 
      .sign(new TextEncoder().encode(SESSION_SECRET));

    // Redirect back to Login page with a flag to show the success state
    const response = NextResponse.redirect(`${BASE_URL}/Login?google_success=true&success_type=${successType}`); 

    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60, // 1 hour
      path: '/',
    });

    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('OAuth Callback error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
