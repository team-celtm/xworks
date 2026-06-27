import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import pool from '@/lib/db';
import { createNotification } from '@/lib/notifications';
import { sendMail } from '@/lib/mail';

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'default_secret';


export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const body = JSON.parse(rawBody);
    const eventType = body.event;
    const eventId = body.id || 'no_id';

    // Idempotency Check: Did we already process this exact webhook event?
    const checkLog = await pool.query(
      `SELECT id FROM payment_webhook_logs WHERE payload->>'id' = $1`,
      [eventId]
    );

    if (checkLog.rows.length > 0) {
      return NextResponse.json({ status: 'ignored', reason: 'duplicate' });
    }

    // Insert log
    await pool.query(
      `INSERT INTO payment_webhook_logs (event_type, payload, status) VALUES ($1, $2, $3)`,
      [eventType, body, 'processing']
    );

    const paymentEntity = body.payload?.payment?.entity;
    
    if (paymentEntity && paymentEntity.id) {
        const paymentId = paymentEntity.id;
        const method = paymentEntity.method;
        const fee = (paymentEntity.fee || 0) / 100;
        const tax = (paymentEntity.tax || 0) / 100;
        const amount = (paymentEntity.amount || 0) / 100;
        const net = amount - fee - tax;
        const errorReason = paymentEntity.error_description;

        if (eventType === 'payment.captured') {
            const orderId = paymentEntity.order_id;
            const paymentId = paymentEntity.id;
            const courseId = paymentEntity.notes?.courseId;
            const userId = paymentEntity.notes?.userId || (await pool.query('SELECT user_id FROM payments WHERE razorpay_order_id = $1', [orderId])).rows[0]?.user_id;
            const sessionId = paymentEntity.notes?.sessionId;
            const promoCode = paymentEntity.notes?.promoCode;

            let enrolmentId = null;

            if (userId && courseId) {
              const checkEnrol = await pool.query(
                'SELECT id, status FROM enrolments WHERE user_id = $1 AND course_id = $2',
                [userId, courseId]
              );

              if (checkEnrol.rows.length > 0) {
                const existing = checkEnrol.rows[0];
                enrolmentId = existing.id;
                if (existing.status !== 'active') {
                  await pool.query(
                    "UPDATE enrolments SET status = 'active', progress_pct = 0, enrolled_at = NOW(), completed_at = NULL WHERE id = $1",
                    [enrolmentId]
                  );
                }
              } else {
                // Create Enrollment
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
                  paymentEntity.amount, 
                  paymentEntity.currency,
                  promoCode || null
                ]);
                enrolmentId = enrolRes.rows[0].id;
              }

              // Auto-register session if provided
              if (sessionId && enrolmentId) {
                const regCheck = await pool.query(
                  'SELECT id FROM session_registrations WHERE enrolment_id = $1 AND session_id = $2',
                  [enrolmentId, sessionId]
                );
                if (regCheck.rows.length === 0) {
                  // Verify session is still valid
                  const sessionCheck = await pool.query(
                    'SELECT scheduled_start, status, max_seats, registered_count FROM live_sessions WHERE id = $1',
                    [sessionId]
                  );
                  if (sessionCheck.rows.length > 0) {
                    const sess = sessionCheck.rows[0];
                    const sessionStart = new Date(sess.scheduled_start);
                    if (sessionStart.getTime() > Date.now() && sess.status !== 'cancelled' && (!sess.max_seats || sess.registered_count < sess.max_seats)) {
                      const client = await pool.connect();
                      try {
                        await client.query('BEGIN');
                        await client.query(
                          "INSERT INTO session_registrations (enrolment_id, session_id, status, registered_at) VALUES ($1, $2, 'registered', NOW())",
                          [enrolmentId, sessionId]
                        );
                        await client.query(
                          'UPDATE live_sessions SET registered_count = registered_count + 1 WHERE id = $1',
                          [sessionId]
                        );
                        await client.query('COMMIT');

                        // Send confirmation email
                        const userRes = await pool.query('SELECT email, first_name FROM users WHERE id = $1', [userId]);
                        const courseRes = await pool.query('SELECT name FROM courses WHERE id = $1', [courseId]);
                        if (userRes.rows.length > 0 && courseRes.rows.length > 0) {
                          const student = userRes.rows[0];
                          const courseName = courseRes.rows[0].name;
                          await sendMail({
                            to: student.email,
                            subject: `Booking Confirmed: ${courseName} Live Session`,
                            html: `
                              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                                <h2 style="color: #4F46E5;">Booking Confirmed! ✅</h2>
                                <p>Hi ${student.first_name},</p>
                                <p>You have successfully registered for the live session of <strong>${courseName}</strong>.</p>
                                <p>The join link will be activated in your dashboard 10 minutes before the start time.</p>
                              </div>
                            `
                          });
                        }
                      } catch (err) {
                        await client.query('ROLLBACK');
                        console.error('Error in session registration:', err);
                      } finally {
                        client.release();
                      }
                    }
                  }
                }
              }
            }

            // Update payment record (incorporating the enrolmentId)
            const updateRes = await pool.query(`
                UPDATE payments 
                SET payment_status = 'paid',
                    status = 'captured',
                    payment_method = $1,
                    gateway_fee = $2,
                    tax_amount = $3,
                    net_amount = $4,
                    paid_at = NOW(),
                    webhook_verified = true,
                    enrolment_id = $5,
                    metadata = $6
                WHERE razorpay_payment_id = $7 OR razorpay_order_id = $8
                RETURNING id
            `, [method, fee, tax, net, enrolmentId ? enrolmentId.toString() : null, paymentEntity, paymentId, orderId]);

            if (updateRes.rowCount === 0) {
              await pool.query(`
                INSERT INTO payments (
                  user_id, enrolment_id, razorpay_order_id, razorpay_payment_id,
                  status, payment_status, amount, payment_method, gateway_fee, tax_amount, net_amount,
                  paid_at, webhook_verified, metadata, created_at
                )
                VALUES ($1, $2, $3, $4, 'captured', 'paid', $5, $6, $7, $8, $9, NOW(), true, $10, NOW())
              `, [
                userId,
                enrolmentId ? enrolmentId.toString() : null,
                orderId,
                paymentId,
                amount,
                method,
                fee,
                tax,
                net,
                paymentEntity
              ]);
            }

            // Dispatch enrollment notification to student
            if (userId && courseId) {
              const userRes = await pool.query('SELECT email, first_name FROM users WHERE id = $1', [userId]);
              const courseRes = await pool.query('SELECT name, instructor_id FROM courses WHERE id = $1', [courseId]);
              if (userRes.rows.length > 0 && courseRes.rows.length > 0) {
                const student = userRes.rows[0];
                const courseName = courseRes.rows[0].name;
                const reqOrigin = req.nextUrl?.origin || `https://${req.headers.get('host') || 'www.xworks.com'}`;

                await createNotification({
                  userId,
                  title: 'Enrollment Successful! 🎓',
                  message: `Welcome to "${courseName}"! Your enrollment was processed successfully.`,
                  type: 'success',
                  sendEmail: true,
                  emailTo: student.email,
                  emailSubject: `Welcome to ${courseName}!`,
                  emailHtml: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                      <h2 style="color: #4F46E5;">Enrollment Successful! 🎓</h2>
                      <p>Hi ${student.first_name},</p>
                      <p>You have successfully enrolled in <strong>${courseName}</strong>.</p>
                      <a href="${reqOrigin}/dashboard" style="display: inline-block; background: #C74A4A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">Go to Dashboard</a>
                    </div>
                  `
                });

                // Notify Instructor
                const instructorRes = await pool.query('SELECT user_id FROM instructors WHERE id = $1', [courseRes.rows[0].instructor_id]);
                if (instructorRes.rows.length > 0) {
                  await createNotification({
                    userId: instructorRes.rows[0].user_id,
                    title: 'New Student Enrolled 📈',
                    message: `A new learner (${student.first_name}) has enrolled in your course "${courseName}".`,
                    type: 'info'
                  });
                }
              }
            }
        } else if (eventType === 'payment.failed') {
            await pool.query(`
                UPDATE payments 
                SET payment_status = 'failed',
                    failed_reason = $1,
                    webhook_verified = true,
                    metadata = $2
                WHERE razorpay_payment_id = $3 OR razorpay_order_id = $4
            `, [errorReason, paymentEntity, paymentId, paymentEntity.order_id]);
        } else if (eventType === 'refund.processed') {
            const refundEntity = body.payload?.refund?.entity;
            if (refundEntity) {
              const refundAmount = (refundEntity.amount || 0) / 100;
              const refundId = refundEntity.id;

              // Find local payment record
              const localPayRes = await pool.query(`
                SELECT id, amount, enrolment_id 
                FROM payments 
                WHERE razorpay_payment_id = $1 OR razorpay_order_id = $2
              `, [paymentId, paymentEntity.order_id]);

              if (localPayRes.rows.length > 0) {
                const localPay = localPayRes.rows[0];
                const paymentDbId = localPay.id;
                const originalAmount = parseFloat(localPay.amount);

                // Check if this refund event is already stored
                const checkRes = await pool.query(`
                  SELECT id FROM refund_events 
                  WHERE payment_id = $1 AND (dispute_notes LIKE $2 OR (amount = $3 AND status = 'refunded'))
                `, [paymentDbId, `%${refundId}%`, refundAmount]);

                if (checkRes.rows.length === 0) {
                  // Insert refund event
                  await pool.query(`
                    INSERT INTO refund_events (payment_id, amount, reason_category, status, dispute_notes, created_at, updated_at)
                    VALUES ($1, $2, 'other', 'refunded', $3, NOW(), NOW())
                  `, [paymentDbId, refundAmount, `Razorpay Webhook Refund ID: ${refundId}`]);
                }

                // Sum all refund events for this payment to determine if it is a partial refund
                const sumRes = await pool.query(`
                  SELECT COALESCE(SUM(amount), 0) as total 
                  FROM refund_events 
                  WHERE payment_id = $1 AND status IN ('approved', 'refunded')
                `, [paymentDbId]);
                const totalRefunded = parseFloat(sumRes.rows[0].total);

                const isPartial = totalRefunded < originalAmount;
                const finalStatus = isPartial ? 'partially_refunded' : 'refunded';

                // Update payment status
                await pool.query(`
                  UPDATE payments 
                  SET payment_status = $1,
                      status = $1,
                      refunded_at = NOW(),
                      metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{refund_info}', $2::jsonb)
                  WHERE id = $3
                `, [finalStatus, JSON.stringify(refundEntity), paymentDbId]);

                // Revoke enrolment if fully refunded
                if (!isPartial && localPay.enrolment_id) {
                  await pool.query(`
                    UPDATE enrolments 
                    SET status = 'refunded' 
                    WHERE id = $1
                  `, [localPay.enrolment_id]);
                }
              }
            }
        }
    }

    await pool.query(
      `UPDATE payment_webhook_logs SET status = 'processed' WHERE payload->>'id' = $1`,
      [eventId]
    );

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
