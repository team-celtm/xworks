import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { isRateLimited } from '@/lib/rateLimit';

const SESSION_SECRET = process.env.SESSION_SECRET!;

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests. Please try again in 15 minutes.' }, { status: 429 });
  }

  try {
    const { email: rawEmail, password } = await req.json();
    const email = rawEmail ? rawEmail.trim().toLowerCase() : '';

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Find user
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    // Constant-time timing check dummy to prevent timing attacks (BUG-007)
    const dummyHash = '$2b$10$EpR0S3.9/iH6E/XyJ1f9IepN09Zg3k9J.cOq9S6a/Tq8n6G0lKz0e';

    if (rows.length === 0) {
      await bcrypt.compare(password, dummyHash);
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const user = rows[0];

    // Check if user is deleted
    if (user.deleted_at) {
       await bcrypt.compare(password, dummyHash);
       return NextResponse.json({ error: 'This account has been deleted' }, { status: 401 });
    }

    // Check if user is suspended
    if (user.status === 'suspended') {
      await bcrypt.compare(password, dummyHash);
      return NextResponse.json({ error: 'Your account is suspended. Please contact support.' }, { status: 403 });
    }

    // Check password set
    if (!user.password_hash) {
      await bcrypt.compare(password, dummyHash);
      return NextResponse.json({ 
        error: 'This account does not have a password set. Please log in with Google, or use the Forgot Password link to set a password.' 
      }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Check if verified
    if (!user.email_verified) {
      return NextResponse.json({ 
        error: 'Please verify your email address before logging in.', 
        needsVerification: true 
      }, { status: 403 });
    }

    // Generate Access Token (short-lived, e.g. 1h)
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

    // Generate Refresh Token (long-lived, e.g. 7d)
    const refreshToken = await new SignJWT({ 
        id: user.id,
        version: user.refresh_token_version || 1
      })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d') 
      .sign(new TextEncoder().encode(SESSION_SECRET));

    const response = NextResponse.json({ 
      message: 'Login successful', 
      user: { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        status: user.status
      } 
    }, { status: 200 });

    // Set Access Token in Cookie
    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60, // 1 hour
      path: '/',
    });

    // Set Refresh Token in Cookie
    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    // Update last_active_at
    await pool.query('UPDATE users SET last_active_at = NOW() WHERE id = $1', [user.id]);

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
