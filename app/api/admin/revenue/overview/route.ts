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
    // Check Analytics Cache
    const cacheKey = 'revenue_overview';
    const cacheRes = await pool.query('SELECT data FROM analytics_cache WHERE cache_key = $1 AND expires_at > NOW()', [cacheKey]);
    
    if (cacheRes.rows.length > 0) {
       return NextResponse.json(cacheRes.rows[0].data);
    }

    const fromClause = `
      FROM (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY COALESCE(NULLIF(razorpay_payment_id, ''), id::text) ORDER BY created_at DESC) as rn
        FROM payments
      ) p
      LEFT JOIN enrolments e ON e.id::text = p.enrolment_id
      WHERE p.rn = 1 AND COALESCE(p.payment_status, p.status) IN ('paid', 'success', 'captured', 'refunded', 'partially_refunded', 'disputed')
    `;

    const analyticsQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN COALESCE(p.payment_status, p.status) IN ('paid', 'success', 'captured', 'refunded', 'partially_refunded', 'disputed') THEN p.amount ELSE 0 END), 0) as total_revenue,
        COALESCE((SELECT SUM(amount) FROM refund_events WHERE status IN ('approved', 'refunded')), 0) as refund_amount,
        COALESCE(AVG(CASE WHEN COALESCE(p.payment_status, p.status) IN ('paid', 'success', 'captured') THEN p.amount ELSE NULL END), 0) as avg_order_value
      ${fromClause}
    `;
    const analyticsRes = await pool.query(analyticsQuery);
    const analytics = analyticsRes.rows[0];

    const chartQuery = `
      SELECT 
        TO_CHAR(DATE(p.created_at), 'Mon DD') as date,
        SUM(p.amount) as revenue
      ${fromClause}
      GROUP BY DATE(p.created_at)
      ORDER BY DATE(p.created_at) ASC
      LIMIT 30
    `;
    const chartRes = await pool.query(chartQuery);
    const chartData = chartRes.rows.map(row => ({
      date: row.date,
      revenue: parseFloat(row.revenue || '0')
    }));

    const gross = parseFloat(analytics.total_revenue || '0');
    const refunds = parseFloat(analytics.refund_amount || '0');
    const net = Math.max(0, gross - refunds);
    const rate = gross > 0 ? (refunds / gross) * 100 : 0;

    const payload = {
      chartData,
      overview: {
        totalRevenue: gross,
        netRevenue: net,
        refundAmount: refunds,
        refundRate: rate,
        avgOrderValue: parseFloat(analytics.avg_order_value || '0')
      }
    };

    // Cache the result for 5 minutes
    await pool.query(`
      INSERT INTO analytics_cache (cache_key, data, expires_at)
      VALUES ($1, $2, NOW() + INTERVAL '5 minutes')
      ON CONFLICT (cache_key) DO UPDATE 
      SET data = EXCLUDED.data, expires_at = EXCLUDED.expires_at, updated_at = NOW()
    `, [cacheKey, JSON.stringify(payload)]);

    return NextResponse.json(payload);
  } catch (err: any) {
    console.error('API Revenue Overview Error:', err);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
