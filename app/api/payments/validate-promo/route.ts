import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { jwtVerify } from 'jose';

const SESSION_SECRET = process.env.SESSION_SECRET!;

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user (BUG-008)
    const accessToken = req.cookies.get('access_token')?.value;
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      await jwtVerify(accessToken, new TextEncoder().encode(SESSION_SECRET));
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await req.json();

    if (!code) {
      return NextResponse.json({ error: 'Promo code is required' }, { status: 400 });
    }

    // 2. Query with usage limit checks (BUG-008)
    const { rows } = await pool.query(
      'SELECT * FROM promo_codes WHERE code = $1 AND expiry_date > NOW() AND (max_uses IS NULL OR used_count < max_uses)',
      [code.toUpperCase()]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Invalid, expired, or fully used promo code' }, { status: 404 });
    }

    const promo = rows[0];

    // 3. Return both discountPercentage and discountAmount (BUG-008)
    return NextResponse.json({
      success: true,
      code: promo.code,
      discountPercentage: promo.discount_percentage ? parseFloat(promo.discount_percentage) : null,
      discountAmount: promo.discount_amount ? parseFloat(promo.discount_amount) : null
    }, { status: 200 });

  } catch (error) {
    console.error('Validate Promo Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
