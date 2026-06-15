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

export async function GET(req: Request) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    let page = parseInt(searchParams.get('page') || '1');
    if (isNaN(page) || page < 1) page = 1;
    let limit = parseInt(searchParams.get('limit') || '10');
    if (isNaN(limit) || limit < 1) limit = 10;
    if (limit > 100) limit = 100;
    
    const offset = (page - 1) * limit;

    const query = `
      SELECT f.*, u.first_name, u.last_name, u.email, c.name as course_name
      FROM failed_payment_logs f
      LEFT JOIN users u ON u.id = f.user_id
      LEFT JOIN courses c ON c.id = f.course_id
      ORDER BY f.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await pool.query(query, [limit, offset]);
    
    const countRes = await pool.query('SELECT COUNT(*) FROM failed_payment_logs');
    const total = parseInt(countRes.rows[0].count);

    return NextResponse.json({ 
      failedPayments: result.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    });
  } catch (err: any) {
    console.error('API Failed Payments Error:', err);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
