import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { jwtVerify } from 'jose';

const SESSION_SECRET = process.env.SESSION_SECRET || 'your-default-secret-change-me';

// Helper to get instructor ID
async function getInstructorId(req: NextRequest) {
  const accessToken = req.cookies.get('access_token')?.value;
  if (!accessToken) return null;

  try {
    const { payload } = await jwtVerify(accessToken, new TextEncoder().encode(SESSION_SECRET));
    const userId = (payload as any).id;

    const res = await pool.query('SELECT id FROM instructors WHERE user_id = $1', [userId]);
    if (res.rows.length === 0) return null;
    return res.rows[0].id;
  } catch (e) {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const instructorId = await getInstructorId(req);
    if (!instructorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const historyRes = await pool.query(`
      SELECT id, amount_paise, status, bank_details, created_at, updated_at
      FROM payout_requests
      WHERE instructor_id = $1
      ORDER BY created_at DESC
    `, [instructorId]);

    const payouts = historyRes.rows.map(row => ({
      id: row.id,
      amount: parseInt(row.amount_paise, 10) / 100,
      status: row.status,
      bankDetails: row.bank_details,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    return NextResponse.json({ success: true, payouts }, { status: 200 });
  } catch (error) {
    console.error('Payout History API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const instructorId = await getInstructorId(req);
    if (!instructorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { amount, bankDetails } = body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }
    if (!bankDetails || !bankDetails.accountName || !bankDetails.accountNumber || !bankDetails.ifsc) {
      return NextResponse.json({ error: 'Incomplete bank details' }, { status: 400 });
    }

    const amountPaise = Math.round(amount * 100);

    // 1. Calculate pending payout again to prevent withdrawing more than earned
    const statsRes = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN NOT EXISTS (SELECT 1 FROM payments p WHERE p.enrolment_id = e.id::text AND p.status IN ('refunded', 'failed')) THEN e.price_paid_paise ELSE 0 END), 0) as gross_revenue_paise
      FROM enrolments e
      JOIN courses c ON e.course_id = c.id
      WHERE c.instructor_id = $1
    `, [instructorId]);

    const grossRevenuePaise = parseInt(statsRes.rows[0].gross_revenue_paise, 10);
    const netEarningsPaise = Math.max(0, grossRevenuePaise * 0.8);

    // Get total already withdrawn or pending withdrawal
    const withdrawnRes = await pool.query(`
      SELECT COALESCE(SUM(amount_paise), 0) as total_withdrawn
      FROM payout_requests
      WHERE instructor_id = $1 AND status != 'Failed'
    `, [instructorId]);
    const totalWithdrawnPaise = parseInt(withdrawnRes.rows[0].total_withdrawn, 10);

    const availablePaise = netEarningsPaise - totalWithdrawnPaise;

    if (amountPaise > availablePaise) {
      return NextResponse.json({ error: 'Insufficient available earnings' }, { status: 400 });
    }

    // Insert payout request
    const insertRes = await pool.query(`
      INSERT INTO payout_requests (instructor_id, amount_paise, status, bank_details)
      VALUES ($1, $2, $3, $4)
      RETURNING id, amount_paise, status, created_at
    `, [instructorId, amountPaise, 'Requested', bankDetails]);

    const row = insertRes.rows[0];

    return NextResponse.json({
      success: true,
      message: 'Payout request submitted successfully',
      payout: {
        id: row.id,
        amount: parseInt(row.amount_paise, 10) / 100,
        status: row.status,
        createdAt: row.created_at
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Withdraw Request API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
