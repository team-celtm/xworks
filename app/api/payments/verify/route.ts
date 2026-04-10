import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import crypto from 'crypto';
import { jwtVerify } from 'jose';

const SESSION_SECRET = process.env.SESSION_SECRET || 'your-default-secret-change-me';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

export async function POST(req: NextRequest) {
  try {
    const accessToken = req.cookies.get('access_token')?.value;
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { payload: jwtPayload } = await jwtVerify(accessToken, new TextEncoder().encode(SESSION_SECRET));
    const userId = (jwtPayload as any).id;

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, courseId, promoCode } = await req.json();

    // 1. Verify signature
    const text = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET!)
      .update(text)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // 2. Check if already enrolled (maybe webhook already did it)
    const checkRes = await pool.query(
      'SELECT id FROM enrolments WHERE user_id = $1 AND course_id = $2',
      [userId, courseId]
    );

    if (checkRes.rows.length > 0) {
      return NextResponse.json({ success: true, enrolmentId: checkRes.rows[0].id }, { status: 200 });
    }

    // 3. Create Enrolment
    // Get original price from course
    const courseRes = await pool.query('SELECT price FROM courses WHERE id = $1', [courseId]);
    let price = parseFloat(courseRes.rows[0].price);

    // Apply promo if any for price_paid_paise calculation
    let finalPaise = Math.round(price * 100);
    if (promoCode) {
      const promoRes = await pool.query(
        'SELECT discount_percentage FROM promo_codes WHERE code = $1',
        [promoCode.toUpperCase()]
      );
      if (promoRes.rows.length > 0) {
        const discount = (price * parseFloat(promoRes.rows[0].discount_percentage)) / 100;
        finalPaise = Math.round((price - discount) * 100);
      }
    }

    const insertEnrolSql = `
      INSERT INTO enrolments (
        user_id, course_id, status, progress_pct, enrolled_at, 
        price_paid_paise, currency, source, promo_code_used
      )
      VALUES ($1, $2, 'active', 0, NOW(), $3, 'INR', 'razorpay', $4)
      RETURNING id
    `;
    const enrolRes = await pool.query(insertEnrolSql, [userId, courseId, finalPaise, promoCode || null]);
    const enrolmentId = enrolRes.rows[0].id;

    // 4. Update Payment record
    await pool.query(
      `UPDATE payments 
       SET status = 'captured', razorpay_payment_id = $1, enrolment_id = $2, razorpay_signature = $3
       WHERE razorpay_order_id = $4`,
      [razorpay_payment_id, enrolmentId, razorpay_signature, razorpay_order_id]
    );

    return NextResponse.json({ success: true, enrolmentId }, { status: 200 });

  } catch (error) {
    console.error('Verify Payment Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
