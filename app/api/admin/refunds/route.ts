import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import pool from '@/lib/db';

const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'your-default-secret-change-me'
);

async function checkAdmin(req: Request) {
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
  const admin = await checkAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Missing Razorpay Order ID' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update payment
      const paymentRes = await client.query(
        `UPDATE payments SET status = 'refunded' WHERE razorpay_order_id = $1 RETURNING enrolment_id`,
        [orderId]
      );

      if (paymentRes.rows.length === 0) {
        throw new Error('Payment or Order ID not found');
      }

      const { enrolment_id } = paymentRes.rows[0];

      // Cancel enrolment
      await client.query(
        `UPDATE enrolments SET status = 'cancelled' WHERE id = $1`,
        [enrolment_id]
      );

      await client.query('COMMIT');
      return NextResponse.json({ success: true, message: 'Refund processed successfully and enrolment cancelled.' });
    } catch (err: any) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
