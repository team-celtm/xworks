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
  // 1. Try to get from request headers first (Always accurate for the current request)
  if (req) {
    const protocol = req.headers.get('x-forwarded-proto') || 'https';
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    
    // If we have a host and it's not localhost, this is our best bet.
    if (host && !host.includes('localhost')) {
      return `${protocol}://${host}`;
    }
    
    // If it IS localhost, only return it if we are NOT on Vercel
    if (host && host.includes('localhost') && !process.env.VERCEL && !process.env.NEXT_PUBLIC_VERCEL_URL) {
      return `${protocol}://${host}`;
    }
  }

  // 2. Check for manual override in environment (but only if it's not localhost)
  const envBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (envBaseUrl && !envBaseUrl.includes('localhost')) {
    return envBaseUrl.replace(/\/$/, ''); 
  }

  // 3. Fallback to Vercel system variables
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // 4. Ultimate fallback for local development
  return envBaseUrl || 'http://localhost:3000';
}
