import { NextRequest, NextResponse } from 'next/server';
import { getBaseUrl } from '@/lib/utils';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const BASE_URL = getBaseUrl(req);
  const REDIRECT_URI = `${BASE_URL}/api/auth/google/callback`;

  // Standard Google scopes
  const scope = encodeURIComponent('https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email');
  
  // Generate secure state parameter
  const state = crypto.randomBytes(16).toString('hex');

  // Construct Google Auth URL
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${state}`;

  const response = NextResponse.redirect(googleAuthUrl);
  
  response.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' && BASE_URL.startsWith('https'),
    sameSite: 'lax',
    maxAge: 300, // 5 minutes
    path: '/'
  });

  return response;
}
