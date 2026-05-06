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
  // 1. Check for manual override in environment
  const envBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const isVercel = process.env.VERCEL === '1' || !!process.env.NEXT_PUBLIC_VERCEL_URL;
  
  // If we are on Vercel but NEXT_PUBLIC_BASE_URL is set to localhost, ignore it.
  if (envBaseUrl && (!isVercel || !envBaseUrl.includes('localhost'))) {
    return envBaseUrl.replace(/\/$/, ''); 
  }

  // 2. Try to get from request headers (most reliable)
  if (req) {
    const protocol = req.headers.get('x-forwarded-proto') || 'https';
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    
    // Ensure we don't return localhost if we are on Vercel
    if (host && (!isVercel || !host.includes('localhost'))) {
      return `${protocol}://${host}`;
    }
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
