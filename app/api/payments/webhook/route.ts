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

      // 2. Process payment transactionally with FOR UPDATE locks to ensure idempotency and prevent duplicate enrolments
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Check if the payment record is already captured to prevent concurrent processing (BUG-005, BUG-015)
        const payCheck = await client.query(
          'SELECT id, status, enrolment_id, user_id FROM payments WHERE razorpay_order_id = $1 FOR UPDATE',
          [orderId]
        );

        if (payCheck.rows.length > 0) {
          const paymentRecord = payCheck.rows[0];
          
          if (paymentRecord.status === 'captured') {
            console.log('Payment already processed (captured):', orderId);
            await client.query('COMMIT');
            return NextResponse.json({ status: 'ok' }, { status: 200 });
          }

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

          // Check if an active enrolment already exists to avoid duplicate active enrolments (BUG-005)
          const existingEnrol = await client.query(
            'SELECT id, status FROM enrolments WHERE user_id = $1 AND course_id = $2',
            [userId, courseId]
          );

          let enrolmentId;
          if (existingEnrol.rows.length > 0) {
            const existing = existingEnrol.rows[0];
            enrolmentId = existing.id;
            if (existing.status !== 'active') {
              await client.query(
                "UPDATE enrolments SET status = 'active', progress_pct = 0, enrolled_at = NOW(), completed_at = NULL WHERE id = $1",
                [enrolmentId]
              );
            }
          } else {
            // 3. Re-enrolment Rule check: Mark any existing active enrolments for this course as completed
            await client.query(
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
            const enrolRes = await client.query(insertEnrolSql, [
              userId, 
              courseId, 
              payment.amount, 
              payment.currency,
              promoCode || null
            ]);
            
            enrolmentId = enrolRes.rows[0].id;
          }

          // Increment the promo code used count if a code was used (BUG-008)
          if (promoCode) {
            await client.query(
              'UPDATE promo_codes SET used_count = used_count + 1 WHERE code = $1',
              [promoCode.toUpperCase()]
            );
          }

          const sessionId = (order as any).notes?.sessionId;
          if (sessionId) {
            // Verify session is still valid and lock the row before auto-registering (BUG-004, BUG-015, BUG-026)
            const sessionCheck = await client.query(
              'SELECT scheduled_start, status, max_seats, registered_count FROM live_sessions WHERE id = $1 FOR UPDATE',
              [sessionId]
            );

            if (sessionCheck.rows.length > 0) {
              const sess = sessionCheck.rows[0];
              const sessionStart = new Date(sess.scheduled_start);
              const isExpired = sessionStart.getTime() <= Date.now();
              const isCancelled = sess.status === 'cancelled';
              const isFull = sess.max_seats !== null && sess.registered_count >= sess.max_seats;

              if (!isExpired && !isCancelled && !isFull) {
                // Check to avoid double registration in this flow
                const regCheck = await client.query(
                  'SELECT id FROM session_registrations WHERE enrolment_id = $1 AND session_id = $2',
                  [enrolmentId, sessionId]
                );
                if (regCheck.rows.length === 0) {
                  await client.query(
                    `INSERT INTO session_registrations (enrolment_id, session_id, status, registered_at) 
                     VALUES ($1::uuid, $2::uuid, 'registered', NOW())`,
                    [enrolmentId, sessionId]
                  );
                  await client.query(
                    'UPDATE live_sessions SET registered_count = registered_count + 1 WHERE id = $1::uuid',
                    [sessionId]
                  );
                }
              } else {
                console.warn('Skipped auto-registration during webhook because session became invalid or full', { sessionId, isExpired, isCancelled, isFull });
              }
            }
          }

          // 5. Update Payment record
          await client.query(
            `UPDATE payments 
             SET status = 'captured', razorpay_payment_id = $1, enrolment_id = $2, razorpay_signature = $3
             WHERE razorpay_order_id = $4`,
            [paymentId, enrolmentId, signature, orderId]
          );

          console.log(`Enrolment success for User ${userId} in Course ${courseId}`);
        }
        await client.query('COMMIT');
      } catch (txErr) {
        await client.query('ROLLBACK');
        throw txErr;
      } finally {
        client.release();
      }
    }

    return NextResponse.json({ status: 'ok' }, { status: 200 });

  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
