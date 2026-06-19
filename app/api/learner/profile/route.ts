import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthId } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const userId = await getAuthId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { rows } = await pool.query(
      'SELECT email, first_name as "firstName", last_name as "lastName", phone, city, preferences FROM users WHERE id = $1',
      [userId]
    );
    if (rows.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json(rows[0]);
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getAuthId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { firstName, lastName, phone, city, preferences } = body;
    console.log('[DEBUG] Updating profile for user:', userId, { firstName, lastName, phone, city });

    // Input validation (BUG-014)
    if (firstName && (typeof firstName !== 'string' || firstName.length > 100)) {
      return NextResponse.json({ error: 'First name must be a string up to 100 characters' }, { status: 400 });
    }
    if (lastName && (typeof lastName !== 'string' || lastName.length > 100)) {
      return NextResponse.json({ error: 'Last name must be a string up to 100 characters' }, { status: 400 });
    }
    if (phone && (typeof phone !== 'string' || phone.length > 20 || !/^\+?[\d\s\-()]{7,20}$/.test(phone))) {
      return NextResponse.json({ error: 'Invalid phone number format or length' }, { status: 400 });
    }
    if (city && (typeof city !== 'string' || city.length > 100)) {
      return NextResponse.json({ error: 'City must be a string up to 100 characters' }, { status: 400 });
    }

    // Sanitize and validate preferences to prevent DB bloat (BUG-014)
    let sanitizedPreferences: Record<string, boolean> = {};
    if (preferences) {
      if (typeof preferences !== 'object' || Array.isArray(preferences)) {
        return NextResponse.json({ error: 'Preferences must be an object' }, { status: 400 });
      }

      const keys = Object.keys(preferences);
      if (keys.length > 20) {
        return NextResponse.json({ error: 'Too many preferences keys' }, { status: 400 });
      }

      for (const key of keys) {
        if (key.length > 50) {
          return NextResponse.json({ error: 'Preference key is too long' }, { status: 400 });
        }
        if (key === 'pending_password_hash') {
          continue; // Prevent client from overriding internal password hash
        }
        if (typeof preferences[key] !== 'boolean') {
          return NextResponse.json({ error: 'Preference values must be booleans' }, { status: 400 });
        }
        sanitizedPreferences[key] = preferences[key];
      }
    }

    // Merge with current preferences in database to preserve database-only properties
    const currentRes = await pool.query('SELECT preferences FROM users WHERE id = $1', [userId]);
    const currentPrefs = currentRes.rows[0]?.preferences || {};
    const mergedPrefs = { ...currentPrefs };
    for (const key of Object.keys(sanitizedPreferences)) {
      mergedPrefs[key] = sanitizedPreferences[key];
    }

    await pool.query(
      `UPDATE public.users 
       SET first_name = $1, last_name = $2, phone = $3, city = $4, preferences = $5 
       WHERE id = $6`,
      [firstName, lastName, phone, city, JSON.stringify(mergedPrefs), userId]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Profile update error detail:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
