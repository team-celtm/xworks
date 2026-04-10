import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { code, courseId } = await req.json();

    if (!code) {
      return NextResponse.json({ error: 'Promo code is required' }, { status: 400 });
    }

    const { rows } = await pool.query(
      'SELECT * FROM promo_codes WHERE code = $1 AND expiry_date > NOW()',
      [code.toUpperCase()]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired promo code' }, { status: 404 });
    }

    const promo = rows[0];

    return NextResponse.json({
      success: true,
      code: promo.code,
      discountPercentage: parseFloat(promo.discount_percentage)
    }, { status: 200 });

  } catch (error) {
    console.error('Validate Promo Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
