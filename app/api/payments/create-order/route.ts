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
    const role = (payload as any).role;

    if (role === 'admin' || role === 'instructor') {
      return NextResponse.json({ error: 'Administrators and Instructors are not allowed to make payments.' }, { status: 403 });
    }

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
    if (format === 'recorded' || format === 'inperson') {
      return NextResponse.json({ error: 'This format is coming soon and is not currently available.' }, { status: 400 });
    }

    // 1.5. Validate session expiry (if applicable)
    if (sessionId) {
      const sessionCheckRes = await pool.query(
        'SELECT scheduled_start, status, max_seats, registered_count FROM live_sessions WHERE id = $1::uuid',
        [sessionId]
      );
      if (sessionCheckRes.rows.length === 0) {
        return NextResponse.json({ success: false, message: 'Session not found.' }, { status: 404 });
      }
      
      const sess = sessionCheckRes.rows[0];
      const sessionStart = new Date(sess.scheduled_start);
      if (sessionStart.getTime() <= Date.now()) {
        return NextResponse.json({ 
          success: false, 
          message: 'This session slot has expired.' 
        }, { status: 400 });
      }

      if (sess.status === 'cancelled') {
        return NextResponse.json({ 
          success: false, 
          message: 'This session slot has been cancelled.' 
        }, { status: 400 });
      }

      if (sess.max_seats !== null && sess.registered_count >= sess.max_seats) {
        return NextResponse.json({ 
          success: false, 
          message: 'This session slot is full.' 
        }, { status: 400 });
      }
    }

    console.log('Course Details:', { name: courseName, basePrice: courseRes.rows[0].price, adjustedPrice: price, format });

    // 2. Apply promo if any
    let discount = 0;
    if (promoCode) {
      const promoRes = await pool.query(
        'SELECT discount_percentage, discount_amount FROM promo_codes WHERE code = $1 AND expiry_date > NOW()',
        [promoCode.toUpperCase()]
      );
      if (promoRes.rows.length > 0) {
        const p = promoRes.rows[0];
        const discountPercentage = p.discount_percentage ? Number(p.discount_percentage) : null;
        const discountAmount = p.discount_amount ? Number(p.discount_amount) : null;

        if (discountAmount !== null) {
          discount = discountAmount;
        } else if (discountPercentage !== null) {
          discount = (price * discountPercentage) / 100;
        }

        price = Math.max(0, price - discount);
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
