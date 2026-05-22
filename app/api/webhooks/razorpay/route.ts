import { NextResponse } from 'next/server';
import crypto from 'crypto';
import pool from '@/lib/db';

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'default_secret';

export async function POST(req: Request) {
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
            await pool.query(`
                UPDATE payments 
                SET payment_status = 'paid',
                    payment_method = $1,
                    gateway_fee = $2,
                    tax_amount = $3,
                    net_amount = $4,
                    paid_at = NOW(),
                    webhook_verified = true,
                    metadata = $5
                WHERE razorpay_payment_id = $6 OR razorpay_order_id = $7
            `, [method, fee, tax, net, paymentEntity, paymentId, paymentEntity.order_id]);
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
            await pool.query(`
                UPDATE payments 
                SET payment_status = 'refunded',
                    refunded_at = NOW(),
                    metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{refund_info}', $1::jsonb)
                WHERE razorpay_payment_id = $2 OR razorpay_order_id = $3
            `, [JSON.stringify(refundEntity || {}), paymentId, paymentEntity.order_id]);
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
