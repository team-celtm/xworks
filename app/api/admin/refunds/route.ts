import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import pool from '@/lib/db';
import { createNotification } from '@/lib/notifications';
import Razorpay from 'razorpay';

const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET!
);

async function checkAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SESSION_SECRET);
    if ((payload as any).role !== 'admin') return null;
    return payload as any;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { orderId, refundAmount, reason } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Missing Razorpay Order ID' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Fetch existing payment and lock the row to avoid parallel refund races
      const paymentCheck = await client.query(
        `SELECT * FROM payments WHERE razorpay_order_id = $1 OR razorpay_payment_id = $1 FOR UPDATE`,
        [orderId]
      );

      if (paymentCheck.rows.length === 0) {
        throw new Error('Payment not found');
      }

      const payment = paymentCheck.rows[0];
      const totalAmount = parseFloat(payment.amount);
      const fee = parseFloat(payment.gateway_fee || '0');
      const tax = parseFloat(payment.tax_amount || '0');

      if (payment.payment_status === 'refunded') {
        throw new Error('Payment is already fully refunded');
      }

      const alreadyRefunded = (payment.metadata?.refunds || []).reduce(
        (acc: number, r: any) => acc + parseFloat(r.amount || '0'),
        0
      );

      const refundValue = refundAmount ? parseFloat(refundAmount) : (totalAmount - alreadyRefunded);

      if (refundValue <= 0) {
        throw new Error('Refund amount must be greater than zero');
      }

      if (alreadyRefunded + refundValue > totalAmount) {
        throw new Error('Total refunds would exceed original payment amount');
      }

      const isPartial = (alreadyRefunded + refundValue) < totalAmount;
      const newStatus = isPartial ? 'partially_refunded' : 'refunded';
      
      // Clamp newNet to 0 to prevent negative values (BUG-020)
      const newNet = Math.max(0, totalAmount - (alreadyRefunded + refundValue) - fee - tax);

      if (!payment.razorpay_payment_id) {
        throw new Error('No Razorpay payment ID found on this record to process refund');
      }

      // Initialize Razorpay client (BUG-009)
      const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
      const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
      if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
        throw new Error('Razorpay credentials are not configured');
      }
      
      const razorpay = new Razorpay({
        key_id: RAZORPAY_KEY_ID,
        key_secret: RAZORPAY_KEY_SECRET,
      });

      // Call Razorpay API (BUG-009)
      try {
        await razorpay.payments.refund(payment.razorpay_payment_id, {
          amount: Math.round(refundValue * 100), // convert to paise
          notes: { reason: reason || 'Admin refund', admin_id: admin.id, orderId }
        });
      } catch (rzpErr: any) {
        console.error('Razorpay Refund API Failure:', rzpErr);
        throw new Error(`Razorpay Refund API error: ${rzpErr.description || rzpErr.message || 'Unknown error'}`);
      }

      const metadataUpdate = {
        ...payment.metadata,
        refunds: [
           ...(payment.metadata?.refunds || []),
           { amount: refundValue, reason, date: new Date().toISOString(), by: admin.id }
        ]
      };

      // Update payment status in database
      const paymentRes = await client.query(
        `UPDATE payments 
         SET payment_status = $1, 
             net_amount = $2, 
             refunded_at = NOW(),
             metadata = $3::jsonb
         WHERE id = $4 RETURNING id, enrolment_id`,
        [newStatus, newNet, JSON.stringify(metadataUpdate), payment.id]
      );

      const { id: paymentId, enrolment_id } = paymentRes.rows[0];

      // Audit log
      await client.query(
        `INSERT INTO payment_audit_logs (payment_id, action, performed_by, old_data, new_data)
         VALUES ($1, $2, $3, $4, $5)`,
        [paymentId, 'admin_refund', admin.id, payment, { payment_status: newStatus, net_amount: newNet, refunded_amount: refundValue }]
      );

      // Cancel enrolment only if fully refunded
      if (!isPartial && enrolment_id) {
        await client.query(
          `UPDATE enrolments SET status = 'cancelled' WHERE id = $1`,
          [enrolment_id]
        );
      }

      // Notify Student and Admin
      try {
        if (enrolment_id) {
          const studentRes = await client.query(
            'SELECT u.id as user_id, u.email, u.first_name FROM enrolments e JOIN users u ON e.user_id = u.id WHERE e.id = $1',
            [enrolment_id]
          );
          if (studentRes.rows.length > 0) {
            const student = studentRes.rows[0];
            await createNotification({
              userId: student.user_id,
              title: isPartial ? 'Partial Refund Processed 💸' : 'Refund Processed 💸',
              message: `A refund of ₹${refundValue} has been processed. ${isPartial ? '' : 'Your course enrollment has been cancelled.'}`,
              type: 'info',
              sendEmail: true,
              emailTo: student.email,
              emailSubject: `Refund Processed`,
              emailHtml: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                  <h2 style="color: #4F46E5;">Refund Processed</h2>
                  <p>Hi ${student.first_name},</p>
                  <p>A refund of <strong>₹${refundValue}</strong> has been processed for your course payment.</p>
                  <p>${isPartial ? 'Your enrollment remains active.' : 'Your enrollment has been cancelled because of a full refund.'}</p>
                </div>
              `
            });
          }
        }

        // Notify Admin
        await createNotification({
          role: 'admin',
          title: 'Refund Processed 💸',
          message: `Admin processed a ${isPartial ? 'partial' : 'full'} refund of ₹${refundValue} for payment ID ${paymentId}.`,
          type: 'info'
        });
      } catch (notifErr) {
        console.error('Error dispatching notifications on refund:', notifErr);
      }

      await client.query('COMMIT');
      return NextResponse.json({ success: true, message: `Refund processed (${isPartial ? 'Partial' : 'Full'}).` });
    } catch (err: any) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error(err);
    // Sanitize error messages to avoid internal details leakage (BUG-027)
    const knownErrors = [
      'Payment not found',
      'Payment is already fully refunded',
      'Refund amount must be greater than zero',
      'Refund exceeds amount',
      'Total refunds would exceed original payment amount',
      'No Razorpay payment ID found on this record to process refund',
      'Razorpay credentials are not configured'
    ];
    const isKnown = knownErrors.includes(err.message) || err.message?.startsWith('Razorpay Refund API error:');
    return NextResponse.json(
      { error: isKnown ? err.message : 'Internal Server Error' },
      { status: isKnown ? 400 : 500 }
    );
  }
}
