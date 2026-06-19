import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import pool from '@/lib/db';

const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET!
);

async function checkAdmin(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SESSION_SECRET);
    if ((payload as any).role !== 'admin') return null;
    return payload as any;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const admin = await checkAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await pool.query(`SELECT * FROM promo_codes ORDER BY created_at DESC`);
    return NextResponse.json({ promos: result.rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const admin = await checkAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { code, discount_percentage, discount_amount, max_uses, expiry_date } = body;

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    if (!discount_percentage && !discount_amount) {
      return NextResponse.json({ error: 'Either discount percentage or amount is required' }, { status: 400 });
    }

    if (discount_percentage && discount_amount) {
      return NextResponse.json({ error: 'Cannot provide both discount percentage and amount' }, { status: 400 });
    }

    const normalizedCode = code.toUpperCase();
    const existing = await pool.query('SELECT id FROM promo_codes WHERE code = $1', [normalizedCode]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Promo code already exists' }, { status: 409 });
    }

    const insertRes = await pool.query(
      `INSERT INTO promo_codes (code, discount_percentage, discount_amount, max_uses, expiry_date, created_at) 
       VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
      [normalizedCode, discount_percentage || null, discount_amount || null, max_uses || null, expiry_date || null]
    );

    return NextResponse.json({ success: true, promo: insertRes.rows[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
