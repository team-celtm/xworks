import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import pool from '@/lib/db';
import { createNotification } from '@/lib/notifications';

const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'your-default-secret-change-me'
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

  const client = await pool.connect();
  try {
    const body = await req.json();
    const { payment_id, amount, reason_category, action, dispute_notes } = body;

    if (!payment_id || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await client.query('BEGIN');

    // Fetch the payment to validate amount with ROW LOCK to prevent concurrent refunds
    const payRes = await client.query('SELECT amount, status, payment_status, user_id, enrolment_id FROM payments WHERE id = $1 FOR UPDATE', [payment_id]);
    if (payRes.rows.length === 0) {
      throw new Error('Payment not found');
    }
    const payment = payRes.rows[0];

    // Idempotency check
    if (payment.payment_status === 'refunded' || payment.status === 'refunded') {
       throw new Error('Payment is already fully refunded.');
    }

    // Amount validation
    const parsedAmount = parseFloat(amount);
    const originalAmount = parseFloat(payment.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new Error('Invalid refund amount');
    }

    // Fetch existing approved/processing/refunded refund events for this payment
    const existingRefundsRes = await client.query(`
      SELECT COALESCE(SUM(amount), 0) as total_refunded 
      FROM refund_events 
      WHERE payment_id = $1 AND status IN ('approved', 'refunded', 'processing')
    `, [payment_id]);
    const totalRefundedAlready = parseFloat(existingRefundsRes.rows[0].total_refunded || '0');

    if (parsedAmount + totalRefundedAlready > originalAmount) {
      throw new Error(`Total refunded (₹${totalRefundedAlready + parsedAmount}) cannot exceed original payment amount (₹${originalAmount})`);
    }

    // Simple State Machine Logic
    let newStatus = 'requested';
    if (action === 'approve') newStatus = 'approved';
    else if (action === 'reject') newStatus = 'failed';
    else if (action === 'process') newStatus = 'processing';
    else if (action === 'complete') newStatus = 'refunded';

    // Insert refund_events (without ON CONFLICT because it's an event log and ID is auto-generated UUID)
    const refundRes = await client.query(`
      INSERT INTO refund_events (payment_id, amount, reason_category, status, dispute_notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [payment_id, parsedAmount, reason_category || 'other', newStatus, dispute_notes || '']);

    // If fully or partially refunded, update payment
    if (newStatus === 'refunded') {
      const isPartial = parsedAmount < originalAmount;
      const finalStatus = isPartial ? 'partially_refunded' : 'refunded';

      await client.query('UPDATE payments SET status = $1, payment_status = $1 WHERE id = $2', [finalStatus, payment_id]);
      
      // Only revoke enrolment if it's a FULL refund
      if (!isPartial && payment.enrolment_id) {
        await client.query('UPDATE enrolments SET status = $1 WHERE id = $2', ['refunded', payment.enrolment_id]);
      }

      // Notify Student and Admin
      try {
        if (payment.enrolment_id) {
          const studentRes = await client.query(
            'SELECT u.id as user_id, u.email, u.first_name FROM enrolments e JOIN users u ON e.user_id = u.id WHERE e.id = $1',
            [payment.enrolment_id]
          );
          if (studentRes.rows.length > 0) {
            const student = studentRes.rows[0];
            await createNotification({
              userId: student.user_id,
              title: isPartial ? 'Partial Refund Processed 💸' : 'Refund Processed 💸',
              message: `A refund of ₹${parsedAmount} has been processed. ${isPartial ? '' : 'Your course enrollment has been cancelled.'}`,
              type: 'info',
              sendEmail: true,
              emailTo: student.email,
              emailSubject: `Refund Processed`,
              emailHtml: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                  <h2 style="color: #4F46E5;">Refund Processed</h2>
                  <p>Hi ${student.first_name},</p>
                  <p>A refund of <strong>₹${parsedAmount}</strong> has been processed for your course payment.</p>
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
          message: `Admin processed a ${isPartial ? 'partial' : 'full'} refund of ₹${parsedAmount} for payment ID ${payment_id}.`,
          type: 'info'
        });
      } catch (notifErr) {
        console.error('Error dispatching notifications on refund process:', notifErr);
      }
    }

    // Log the audit event
    const { logAdminAction } = await import('@/lib/audit');
    await logAdminAction(admin.id, `refund_${action}`, 'payment', payment_id.toString(), { status: payment.status }, { status: newStatus, amount });

    await client.query('COMMIT');
    return NextResponse.json({ success: true, refund: refundRes.rows[0] });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('API Refund Process Error:', err);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  } finally {
    client.release();
  }
}
