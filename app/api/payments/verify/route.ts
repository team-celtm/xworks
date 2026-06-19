import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import crypto from 'crypto';
import { jwtVerify } from 'jose';
import Razorpay from 'razorpay';
import { createNotification } from '@/lib/notifications';

const SESSION_SECRET = process.env.SESSION_SECRET!;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;

export async function POST(req: NextRequest) {
  try {
    const accessToken = req.cookies.get('access_token')?.value;
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { payload: jwtPayload } = await jwtVerify(accessToken, new TextEncoder().encode(SESSION_SECRET));
    const userId = (jwtPayload as any).id;

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, courseId, promoCode, sessionId } = await req.json();

    // 1. Verify signature
    const text = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET!)
      .update(text)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      console.error('Signature mismatch detected:', {
        received: razorpay_signature,
        expected: expectedSignature,
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id
      });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // 1.5 Fetch Razorpay order and verify course match (Loophole Fix)
    const razorpay = new Razorpay({
      key_id: RAZORPAY_KEY_ID!,
      key_secret: RAZORPAY_KEY_SECRET!,
    });

    const order = await razorpay.orders.fetch(razorpay_order_id);
    const actualCourseId = (order as any).notes?.courseId;

    if (actualCourseId !== courseId) {
      console.error('Payment loophole attempt detected: courseId mismatch', {
        requestedCourseId: courseId,
        actualCourseId
      });
      return NextResponse.json({ error: 'Order course mismatch detected' }, { status: 400 });
    }

    // 2. Check if already enrolled
    const checkRes = await pool.query(
      'SELECT id, status FROM enrolments WHERE user_id = $1 AND course_id = $2',
      [userId, courseId]
    );
 
    let enrolmentId;

    if (checkRes.rows.length > 0) {
      const existing = checkRes.rows[0];
      enrolmentId = existing.id;
      // If not active (e.g. completed), reset it to active for re-enrolment
      if (existing.status !== 'active') {
        await pool.query(
          "UPDATE enrolments SET status = 'active', progress_pct = 0, enrolled_at = NOW(), completed_at = NULL WHERE id = $1",
          [enrolmentId]
        );
      }
    } else {
      // 3. Create Enrolment
      // Retrieve the database-recorded payment amount if exists
      const paymentRes = await pool.query(
        'SELECT amount FROM payments WHERE razorpay_order_id = $1',
        [razorpay_order_id]
      );

      let finalPaise;
      if (paymentRes.rows.length > 0) {
        finalPaise = Math.round(Number(paymentRes.rows[0].amount) * 100);
      } else {
        // Fallback pricing calculation
        const courseRes = await pool.query('SELECT price FROM courses WHERE id = $1', [courseId]);
        const price = parseFloat(courseRes.rows[0].price);

        // Apply promo if any for price_paid_paise calculation
        finalPaise = Math.round(price * 100);
        if (promoCode) {
          const promoRes = await pool.query(
            'SELECT discount_percentage, discount_amount FROM promo_codes WHERE code = $1',
            [promoCode.toUpperCase()]
          );
          if (promoRes.rows.length > 0) {
            const p = promoRes.rows[0];
            const discountPercentage = p.discount_percentage ? Number(p.discount_percentage) : null;
            const discountAmount = p.discount_amount ? Number(p.discount_amount) : null;
            
            let discount = 0;
            if (discountAmount !== null) {
              discount = discountAmount;
            } else if (discountPercentage !== null) {
              discount = (price * discountPercentage) / 100;
            }
            finalPaise = Math.round(Math.max(0, price - discount) * 100);
          }
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
      enrolmentId = enrolRes.rows[0].id;
    }

    // 4. Update Payment record
    const updateRes = await pool.query(
      `UPDATE payments 
       SET status = 'captured', razorpay_payment_id = $1, enrolment_id = $2, razorpay_signature = $3
       WHERE razorpay_order_id = $4 AND status != 'captured'
       RETURNING id`,
      [razorpay_payment_id, enrolmentId, razorpay_signature, razorpay_order_id]
    );

    const isNewlyCaptured = updateRes.rows.length > 0;

    if (isNewlyCaptured) {
      if (promoCode) {
        try {
          await pool.query(
            'UPDATE promo_codes SET used_count = used_count + 1 WHERE code = $1',
            [promoCode.toUpperCase()]
          );
        } catch (promoErr) {
          console.error('Failed to increment promo code used count:', promoErr);
        }
      }
      try {
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
      } catch (err) {
        console.error('Error dispatching notifications in payment verify:', err);
      }
    }

    // 5. AUTO REGISTER FOR SESSION IF PROVIDED
    if (sessionId) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Verify session is still valid and lock the row before auto-registering (BUG-004)
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
                "INSERT INTO session_registrations (enrolment_id, session_id, status, registered_at) VALUES ($1, $2, 'registered', NOW())",
                [enrolmentId, sessionId]
              );
              await client.query(
                'UPDATE live_sessions SET registered_count = registered_count + 1 WHERE id = $1',
                [sessionId]
              );
            }
          } else {
            console.warn('Skipped auto-registration during verify because session became invalid or full', { sessionId, isExpired, isCancelled, isFull });
          }
        }
        await client.query('COMMIT');
      } catch (sessError) {
        await client.query('ROLLBACK');
        console.error('Auto-session registration failed during verification:', sessError);
        // We don't fail the whole payment verification if session registration fails, 
        // but it's logged. The user can attempt manual registration later.
      } finally {
        client.release();
      }
    }

    return NextResponse.json({ success: true, enrolmentId }, { status: 200 });

  } catch (error) {
    console.error('Verify Payment Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
