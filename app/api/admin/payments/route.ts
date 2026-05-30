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
    
    // Pagination edge cases
    let page = parseInt(searchParams.get('page') || '1');
    if (isNaN(page) || page < 1) page = 1;
    
    let limit = parseInt(searchParams.get('limit') || '10');
    if (isNaN(limit) || limit < 1) limit = 10;
    if (limit > 100) limit = 100; // Max limit to prevent memory overload
    
    const offset = (page - 1) * limit;

    let where = ["p.rn = 1"];
    let params: any[] = [];

    // Base relationships for WHERE clause
    let fromClause = `
      FROM (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY COALESCE(NULLIF(razorpay_payment_id, ''), id::text) ORDER BY created_at DESC) as rn
        FROM payments
      ) p
      LEFT JOIN enrolments e ON e.id::text = p.enrolment_id
      LEFT JOIN users u ON u.id::text = p.user_id OR u.id = e.user_id
      LEFT JOIN courses c ON c.id = e.course_id
    `;

    if (search) {
      params.push(`%${search}%`);
      where.push(`(u.first_name ILIKE $${params.length} OR u.last_name ILIKE $${params.length} OR (u.first_name || ' ' || u.last_name) ILIKE $${params.length} OR u.email ILIKE $${params.length} OR p.razorpay_order_id ILIKE $${params.length} OR p.razorpay_payment_id ILIKE $${params.length})`);
    }
    if (status) {
      if (status === 'completed') {
        where.push(`COALESCE(p.payment_status, p.status) IN ('paid', 'success', 'captured')`);
      } else {
        params.push(status);
        where.push(`COALESCE(p.payment_status, p.status) = $${params.length}`);
      }
    }
    if (courseId) {
      params.push(courseId);
      where.push(`e.course_id = $${params.length}`);
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
      params.push(to);
      where.push(`p.created_at <= $${params.length}`);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const listQuery = `
      SELECT
          p.*,
          u.first_name,
          u.last_name,
          u.email,
          c.name AS course_name,
          e.status AS enrolment_status
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

    // Compute Analytics Globally (applying same filters)
    const analyticsQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN COALESCE(p.payment_status, p.status) IN ('paid', 'success', 'captured', 'refunded', 'partially_refunded', 'disputed') THEN p.amount ELSE 0 END), 0) as total_revenue,
        COALESCE((SELECT SUM(amount) FROM refund_events WHERE status IN ('approved', 'refunded')), 0) as refund_amount,
        COUNT(CASE WHEN COALESCE(p.payment_status, p.status) = 'failed' THEN 1 END) as failed_payments,
        COALESCE(AVG(CASE WHEN COALESCE(p.payment_status, p.status) IN ('paid', 'success', 'captured') THEN p.amount ELSE NULL END), 0) as avg_order_value
      ${fromClause}
      ${whereClause}
    `;
    const analyticsRes = await pool.query(analyticsQuery, params);
    const analytics = analyticsRes.rows[0];

    // Compute Chart Data (Daily Revenue)
    const chartQuery = `
      SELECT 
        TO_CHAR(DATE(p.created_at), 'Mon DD') as date,
        SUM(p.amount) as revenue
      ${fromClause}
      ${whereClause ? whereClause + ' AND' : 'WHERE'} COALESCE(p.payment_status, p.status) IN ('paid', 'success', 'captured', 'refunded', 'partially_refunded', 'disputed')
      GROUP BY DATE(p.created_at)
      ORDER BY DATE(p.created_at) ASC
    `;
    const chartRes = await pool.query(chartQuery, params);
    const chartData = chartRes.rows.map(row => ({
      date: row.date,
      revenue: parseFloat(row.revenue || '0')
    }));

    const gross = parseFloat(analytics.total_revenue || '0');
    const refunds = parseFloat(analytics.refund_amount || '0');
    const net = Math.max(0, gross - refunds);
    const rate = gross > 0 ? (refunds / gross) * 100 : 0;

    return NextResponse.json({ 
      payments: result.rows,
      chartData,
      analytics: {
        totalRevenue: gross,
        netRevenue: net,
        refundAmount: refunds,
        failedPayments: parseInt(analytics.failed_payments || '0'),
        refundRate: rate,
        avgOrderValue: parseFloat(analytics.avg_order_value || '0')
      },
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    });
  } catch (err: any) {
    console.error('API Payments Error:', err);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
