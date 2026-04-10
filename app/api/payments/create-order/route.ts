import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { jwtVerify } from 'jose';
import Razorpay from 'razorpay';

const SESSION_SECRET = process.env.SESSION_SECRET || 'your-default-secret-change-me';
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID!,
  key_secret: RAZORPAY_KEY_SECRET!,
});

export async function POST(req: NextRequest) {
  try {
    const accessToken = req.cookies.get('access_token')?.value;
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { payload } = await jwtVerify(accessToken, new TextEncoder().encode(SESSION_SECRET));
    const userId = (payload as any).id;

    const { courseId, promoCode, format, sessionId } = await req.json();
    console.log('Payment Order Request:', { courseId, promoCode, format, sessionId, userId });

    // 1. Get course price
    const courseRes = await pool.query('SELECT name, price FROM courses WHERE id = $1::uuid', [courseId]);
    if (courseRes.rows.length === 0) {
      console.warn('Course not found:', courseId);
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }
    
    // Convert decimal/numeric from DB to float safely
    let price = Number(courseRes.rows[0].price);
    const courseName = courseRes.rows[0].name;

    // Adjust price based on format
    if (format === 'recorded') {
      price = price * 0.8; // 20% discount for recorded
    } else if (format === 'inperson') {
      price = price + 500; // 500 premium for in person
    }

    console.log('Course Details:', { name: courseName, basePrice: courseRes.rows[0].price, adjustedPrice: price, format });

    // 2. Apply promo if any
    let discount = 0;
    if (promoCode) {
      const promoRes = await pool.query(
        'SELECT discount_percentage FROM promo_codes WHERE code = $1 AND expiry_date > NOW()',
        [promoCode.toUpperCase()]
      );
      if (promoRes.rows.length > 0) {
        discount = (price * Number(promoRes.rows[0].discount_percentage)) / 100;
        price = price - discount;
        console.log('Promo Applied:', { promoCode, discount, finalPrice: price });
      }
    }

    // 3. Create Razorpay order
    const amountInPaise = Math.round(price * 100);
    
    if (amountInPaise <= 0) {
       return NextResponse.json({ error: 'Order amount must be greater than zero' }, { status: 400 });
    }

    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `rcpt_${courseId.split('-')[0]}_${Date.now().toString().slice(-6)}`, // Short receipt
      notes: {
        courseId,
        userId,
        promoCode: promoCode || '',
        format: format || 'live',
        sessionId: sessionId || ''
      }
    };

    console.log('Creating Razorpay Order:', options);
    const order = await razorpay.orders.create(options);

    // 4. Record pending payment
    await pool.query(
      `INSERT INTO payments (user_id, razorpay_order_id, status, amount) 
       VALUES ($1, $2, 'pending', $3)`,
      [userId, order.id, price]
    );

    return NextResponse.json({
      orderId: order.id,
      amount: amountInPaise,
      keyId: RAZORPAY_KEY_ID,
      courseName
    }, { status: 200 });

  } catch (error: any) {
    console.error('Create Order Error Detail:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
