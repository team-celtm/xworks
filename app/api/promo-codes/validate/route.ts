import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { code, courseId, format } = await req.json();

    if (!code) {
      return NextResponse.json({ error: 'Promo code is required' }, { status: 400 });
    }

    const normalizedCode = code.trim().toUpperCase();

    // 1. Fetch promo code details
    const promoRes = await pool.query(
      'SELECT * FROM promo_codes WHERE code = $1',
      [normalizedCode]
    );

    if (promoRes.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid promo code' }, { status: 404 });
    }

    const promo = promoRes.rows[0];

    // 2. Check expiry
    if (promo.expiry_date && new Date(promo.expiry_date) < new Date()) {
      return NextResponse.json({ error: 'Promo code has expired' }, { status: 400 });
    }

    // 3. Check usage count
    const usageRes = await pool.query(
      'SELECT COUNT(*) FROM enrolments WHERE promo_code_used = $1',
      [normalizedCode]
    );
    const useCount = parseInt(usageRes.rows[0].count);

    if (promo.max_uses && useCount >= promo.max_uses) {
      return NextResponse.json({ error: 'Promo code limit reached' }, { status: 400 });
    }

    // 4. Calculate discounted price if courseId is provided
    let originalPrice = 0;
    let discountedPrice = 0;

    if (courseId) {
      const courseRes = await pool.query('SELECT price FROM courses WHERE id = $1', [courseId]);
      if (courseRes.rows.length > 0) {
        originalPrice = parseFloat(courseRes.rows[0].price);
        
        // Apply format adjustment if any
        if (format === 'recorded') {
          originalPrice = originalPrice * 0.8;
        } else if (format === 'inperson') {
          originalPrice = originalPrice + 500;
        }

        const discountPercentage = parseFloat(promo.discount_percentage);
        discountedPrice = originalPrice - (originalPrice * discountPercentage / 100);
      }
    }

    return NextResponse.json({
      success: true,
      code: promo.code,
      discountPercentage: parseFloat(promo.discount_percentage),
      originalPrice,
      discountedPrice,
      message: 'Promo code applied successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Promo Validation Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
