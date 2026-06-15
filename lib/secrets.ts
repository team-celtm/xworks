const secret = process.env.SESSION_SECRET;

if (!secret) {
  throw new Error('SESSION_SECRET environment variable is required');
}

export const SESSION_SECRET = secret;
export const SESSION_SECRET_ENCODED = new TextEncoder().encode(secret);
