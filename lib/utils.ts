import { NextRequest } from 'next/server';

/**
 * Robustly determines the base URL of the application.
 * Priority:
 * 1. process.env.NEXT_PUBLIC_BASE_URL (if set and not localhost in production)
 * 2. Request headers (host, x-forwarded-host)
 * 3. process.env.VERCEL_URL (standard Vercel env var)
 * 4. Fallback to localhost:3000
 */
/**
 * Robustly determines the base URL of the application.
 * Priority:
 * 1. process.env.NEXT_PUBLIC_BASE_URL (Manual override for production/canonical URL)
 * 2. Request headers (host, x-forwarded-host) - Best for dynamic environments
 * 3. process.env.VERCEL_URL (standard Vercel env var)
 * 4. Fallback to localhost:3000
 */
export function getBaseUrl(req?: NextRequest): string {
  // 1. Priority: Manual override (Canonical Production URL)
  // Highly recommended for OAuth to ensure consistent redirect URIs
  const envBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (envBaseUrl && !envBaseUrl.includes('localhost')) {
    return envBaseUrl.replace(/\/$/, '');
  }

  // 2. Fallback: Request headers (Current deployment URL)
  // This is usually correct for both local and production (even with custom domains)
  if (req) {
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    const protocol = req.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');
    
    if (host) {
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


export function formatDuration(totalSeconds: number): string {
  if (!totalSeconds) return '0s';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  
  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || parts.length === 0) parts.push(`${s}s`);
  return parts.join(' ');
}

export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .normalize('NFD')                   // split an accented letter in the base letter and the accent
    .replace(/[\u0300-\u036f]/g, '')   // remove all previously split accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')       // replace all non-alphanumeric chars with hyphen
    .replace(/^-+|-+$/g, '');          // remove leading and trailing hyphens
}
