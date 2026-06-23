const secret = process.env.SESSION_SECRET || 'fallback-unsafe-development-secret-key-change-me';

if (!process.env.SESSION_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️ WARNING: SESSION_SECRET environment variable is not defined in production environment!');
  }
}

export const SESSION_SECRET = secret;
export const SESSION_SECRET_ENCODED = new TextEncoder().encode(secret);

