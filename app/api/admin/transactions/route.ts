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
    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') || '').trim();
    const status = searchParams.get('status') || '';
    const courseId = searchParams.get('course') || '';
    const method = searchParams.get('method') || '';
    const from = searchParams.get('from') || '';
    const to = searchParams.get('to') || '';
    
    // Advanced Pagination & Limits
    let page = parseInt(searchParams.get('page') || '1');
    if (isNaN(page) || page < 1) page = 1;
    let limit = parseInt(searchParams.get('limit') || '10');
    if (isNaN(limit) || limit < 1) limit = 10;
    if (limit > 100) limit = 100;
    
    const offset = (page - 1) * limit;

    let where = [];
    let params: any[] = [];

    // Core table joins
    let fromClause = `
      FROM payments p
      LEFT JOIN enrolments e ON e.id::text = p.enrolment_id
      LEFT JOIN users u ON u.id::text = p.user_id OR u.id = e.user_id
      LEFT JOIN courses c ON c.id = e.course_id
      LEFT JOIN fraud_flags f ON f.payment_id = p.id
    `;

    // Multi-status filtering
    if (search) {
      params.push(`%${search}%`);
      where.push(`(u.first_name ILIKE $${params.length} OR u.last_name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR p.razorpay_order_id ILIKE $${params.length} OR p.razorpay_payment_id ILIKE $${params.length})`);
    }
    if (status) {
      if (status.includes(',')) {
        const statuses = status.split(',');
        const placeholders = statuses.map((_, i) => `$${params.length + i + 1}`);
        params.push(...statuses);
        where.push(`COALESCE(p.payment_status, p.status) IN (${placeholders.join(', ')})`);
      } else {
        params.push(status);
        where.push(`COALESCE(p.payment_status, p.status) = $${params.length}`);
      }
    }
    if (courseId) {
      // Basic UUID or Integer shape validation to prevent Postgres casting crashes
      if (/^[0-9a-fA-F-]{36}$/.test(courseId) || /^[0-9]+$/.test(courseId)) {
        params.push(courseId);
        where.push(`e.course_id = $${params.length}`);
      }
    }
    if (method) {
      params.push(method);
      where.push(`p.payment_method = $${params.length}`);
    }
    if (from && !isNaN(Date.parse(from))) {
      params.push(from);
      where.push(`p.created_at >= $${params.length}`);
    }
    if (to && !isNaN(Date.parse(to))) {
      // Set to the end of the specified day
      const toDate = new Date(to);
      toDate.setUTCHours(23, 59, 59, 999);
      params.push(toDate.toISOString());
      where.push(`p.created_at <= $${params.length}`);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const listQuery = `
      SELECT
          p.id, p.amount, p.status, p.payment_status, p.payment_method, p.created_at, p.razorpay_order_id, p.razorpay_payment_id,
          p.net_amount, p.gateway_fee, p.tax_amount, p.metadata,
          u.first_name, u.last_name, u.email,
          c.name AS course_name, c.instructor_id,
          f.risk_score
      ${fromClause}
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const result = await pool.query(listQuery, [...params, limit, offset]);

    const countQuery = `
      SELECT COUNT(*)
      ${fromClause}
      ${whereClause}
    `;
    const countRes = await pool.query(countQuery, params);
    const total = parseInt(countRes.rows[0].count);

    return NextResponse.json({ 
      transactions: result.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    });
  } catch (err: any) {
    console.error('API Transactions Error:', err);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
