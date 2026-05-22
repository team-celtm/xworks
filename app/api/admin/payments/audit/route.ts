import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import pool from '@/lib/db';

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

export async function GET(req: Request) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const query = `
      SELECT 
        a.id, a.action, a.old_data, a.new_data, a.created_at,
        u.first_name, u.last_name, u.email,
        p.razorpay_order_id, p.razorpay_payment_id
      FROM payment_audit_logs a
      LEFT JOIN users u ON u.id = a.performed_by
      LEFT JOIN payments p ON p.id = a.payment_id
      ORDER BY a.created_at DESC
      LIMIT 100
    `;
    const res = await pool.query(query);

    return NextResponse.json({ logs: res.rows });
  } catch (err: any) {
    console.error('API Audit Error:', err);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
