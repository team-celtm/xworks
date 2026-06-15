import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import pool from '@/lib/db';

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

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    
    const query = `
      SELECT
          p.*,
          u.first_name, u.last_name, u.email,
          c.name AS course_name, c.instructor_id,
          f.risk_score, f.flags as fraud_flags_json, f.ip_address, f.device_id,
          r.status as refund_status, r.amount as refund_amount, r.dispute_notes
      FROM payments p
      LEFT JOIN enrolments e ON e.id::text = p.enrolment_id
      LEFT JOIN users u ON u.id::text = p.user_id OR u.id = e.user_id
      LEFT JOIN courses c ON c.id = e.course_id
      LEFT JOIN fraud_flags f ON f.payment_id = p.id
      LEFT JOIN refund_events r ON r.payment_id = p.id
      WHERE p.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    return NextResponse.json({ transaction: result.rows[0] });
  } catch (err: any) {
    console.error('API Transaction Detail Error:', err);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
