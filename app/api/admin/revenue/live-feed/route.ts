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
        p.id, 
        p.amount, 
        p.created_at as time,
        COALESCE(p.payment_status, p.status) as type,
        u.first_name || ' ' || u.last_name as user,
        c.name as course
      FROM payments p
      LEFT JOIN enrolments e ON e.id::text = p.enrolment_id::text
      LEFT JOIN courses c ON c.id::text = e.course_id::text
      LEFT JOIN users u ON u.id::text = p.user_id::text
      ORDER BY p.created_at DESC
      LIMIT 8
    `;
    const res = await pool.query(query);

    const formattedEvents = res.rows.map(row => {
      let eventType = 'purchase';
      if (row.type === 'failed') eventType = 'failed';
      if (row.type === 'refunded') eventType = 'refund';

      return {
        id: row.id,
        type: eventType,
        user: row.user || 'Anonymous User',
        course: row.course || 'Direct Payment',
        amount: Number(row.amount),
        time: row.time
      };
    });

    return NextResponse.json(formattedEvents);
  } catch (err: any) {
    console.error('API Live Feed Error:', err);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
