import { NextRequest } from 'next/server';

export function getBaseUrl(req?: NextRequest | Request | { headers?: Headers | { get(name: string): string | null } } | null): string {
  // 1. Dynamic Request Headers (highest priority for multi-domain, reverse proxies, and production deployments)
  if (req && 'headers' in req && req.headers) {
    const headers = req.headers;
    const rawHost = headers.get('x-forwarded-host') || headers.get('host');
    const rawProto = headers.get('x-forwarded-proto');

    if (rawHost) {
      // Pick first host if comma-separated (reverse proxies)
      const host = rawHost.split(',')[0].trim();
      
      // Basic sanitization to prevent host header injection
      const isValidHost = /^[a-zA-Z0-9.\-_]+(:[0-9]+)?$/.test(host);

      if (isValidHost) {
        const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
        
        // Determine protocol
        let protocol = rawProto ? rawProto.split(',')[0].trim() : '';
        if (!protocol) {
          protocol = isLocal ? 'http' : 'https';
        }

        // Use request host if it's a real host or if in development
        if (!isLocal || process.env.NODE_ENV !== 'production') {
          return `${protocol}://${host}`;
        }
      }
    }
  }

  // 2. Canonical URL from Environment Variables (skipping localhost in production)
  const envUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || process.env.NEXTAUTH_URL;
  if (envUrl) {
    const trimmed = envUrl.trim().replace(/\/$/, '');
    const isLocal = trimmed.includes('localhost') || trimmed.includes('127.0.0.1');
    if (!isLocal || process.env.NODE_ENV !== 'production') {
      return trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`;
    }
  }

  // 3. Platform hosting environment variables
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/$/, '')}`;
  }
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    const vUrl = process.env.NEXT_PUBLIC_VERCEL_URL.replace(/\/$/, '');
    return vUrl.startsWith('http') ? vUrl : `https://${vUrl}`;
  }
  if (process.env.VERCEL_URL) {
    const vUrl = process.env.VERCEL_URL.replace(/\/$/, '');
    return vUrl.startsWith('http') ? vUrl : `https://${vUrl}`;
  }
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN.replace(/\/$/, '')}`;
  }
  if (process.env.RENDER_EXTERNAL_URL) {
    const rUrl = process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '');
    return rUrl.startsWith('http') ? rUrl : `https://${rUrl}`;
  }

  // 4. Fallback for local development or if env is localhost
  if (envUrl) {
    return envUrl.trim().replace(/\/$/, '');
  }

  return 'http://localhost:3000';
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
