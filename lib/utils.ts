import { NextRequest } from 'next/server';

/**
 * Robustly determines the base URL of the application.
 * Priority:
 * 1. process.env.NEXT_PUBLIC_BASE_URL (if set and not localhost in production)
 * 2. Request headers (host, x-forwarded-host)
 * 3. process.env.VERCEL_URL (standard Vercel env var)
 * 4. Fallback to localhost:3000
 */
export function getBaseUrl(req?: NextRequest): string {
  // 1. Priority: Manual override (Canonical Production URL)
  // This is the most stable way to handle OAuth redirect URIs
  const envBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (envBaseUrl && !envBaseUrl.includes('localhost')) {
    return envBaseUrl.replace(/\/$/, '');
  }

  // 2. Fallback: Request headers (Current deployment URL)
  if (req) {
    const protocol = req.headers.get('x-forwarded-proto') || 'https';
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    
    if (host && !host.includes('localhost')) {
      return `${protocol}://${host}`;
    }
  }

  // 3. Fallback: Vercel System Variables
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }

  // 4. Local Development Fallback
  return envBaseUrl || 'http://localhost:3000';
}
