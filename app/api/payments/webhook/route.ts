import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import Razorpay from 'razorpay';
import crypto from 'crypto';

const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'your_webhook_secret_here';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.error('Webhook signature mismatch');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    console.log('Razorpay Webhook Event:', event.event);

    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;
      const paymentId = payment.id;

      // 1. Idempotency Check
      const existingPay = await pool.query(
        'SELECT id, status FROM payments WHERE razorpay_payment_id = $1',
        [paymentId]
      );
      if (existingPay.rows.length > 0 && existingPay.rows[0].status === 'captured') {
        console.log('Payment already processed:', paymentId);
        return NextResponse.json({ status: 'ok' }, { status: 200 });
      }

      // 2. Get payment record
      const payRes = await pool.query(
        'SELECT * FROM payments WHERE razorpay_order_id = $1',
        [orderId]
      );

      if (payRes.rows.length > 0) {
        const paymentRecord = payRes.rows[0];
        const userId = paymentRecord.user_id;

        const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
        const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
        const razorpay = new Razorpay({
          key_id: RAZORPAY_KEY_ID!,
          key_secret: RAZORPAY_KEY_SECRET!,
        });

        const order = await razorpay.orders.fetch(orderId);
        const courseId = (order as any).notes?.courseId;
        const promoCode = (order as any).notes?.promoCode;

        // 3. Re-enrolment Rule check: Mark any existing active enrolments for this course as completed
        await pool.query(
          "UPDATE enrolments SET status = 'completed' WHERE user_id = $1 AND course_id = $2 AND status = 'active'",
          [userId, courseId]
        );

        // 4. Create Enrolment (Money Rule: payment.amount is paise)
        const insertEnrolSql = `
          INSERT INTO enrolments (
            user_id, course_id, status, progress_pct, enrolled_at, 
            price_paid_paise, currency, source, promo_code_used
          )
          VALUES ($1, $2, 'active', 0, NOW(), $3, $4, 'razorpay', $5)
          RETURNING id
        `;
        const enrolRes = await pool.query(insertEnrolSql, [
          userId, 
          courseId, 
          payment.amount, 
          payment.currency,
          promoCode || null
        ]);
        
        const enrolmentId = enrolRes.rows[0].id;

        const sessionId = (order as any).notes?.sessionId;
        if (sessionId) {
          await pool.query(
            `INSERT INTO session_registrations (enrolment_id, session_id, status, registered_at) 
             VALUES ($1::uuid, $2::uuid, 'registered', NOW())`,
            [enrolmentId, sessionId]
          );
          await pool.query(
            'UPDATE live_sessions SET registered_count = registered_count + 1 WHERE id = $1::uuid',
            [sessionId]
          );
        }

        // 5. Update Payment record
        await pool.query(
          `UPDATE payments 
           SET status = 'captured', razorpay_payment_id = $1, enrolment_id = $2, razorpay_signature = $3
           WHERE razorpay_order_id = $4`,
          [paymentId, enrolmentId, signature, orderId]
        );

        console.log(`Enrolment success for User ${userId} in Course ${courseId}`);
      }
    }

    return NextResponse.json({ status: 'ok' }, { status: 200 });

  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
