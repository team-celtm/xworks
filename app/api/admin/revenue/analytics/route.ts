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
    const cacheKey = 'revenue_deep_analytics';
    const cacheRes = await pool.query('SELECT data FROM analytics_cache WHERE cache_key = $1 AND expires_at > NOW()', [cacheKey]);
    
    if (cacheRes.rows.length > 0) {
       return NextResponse.json(cacheRes.rows[0].data);
    }

    // Top Selling Courses
    const coursesQuery = `
      SELECT c.name, COUNT(e.id) as enrollments, SUM(p.amount) as revenue
      FROM courses c
      LEFT JOIN enrolments e ON c.id = e.course_id
      LEFT JOIN payments p ON e.id::text = p.enrolment_id
      WHERE COALESCE(p.payment_status, p.status) IN ('paid', 'success', 'captured')
      GROUP BY c.id
      ORDER BY revenue DESC
      LIMIT 10
    `;
    const coursesRes = await pool.query(coursesQuery);

    // Instructor Leaderboard
    const instructorsQuery = `
      SELECT u.first_name, u.last_name, SUM(p.amount) as total_generated, SUM(COALESCE(p.net_amount, p.amount)*0.8) as instructor_cut
      FROM instructors i
      JOIN users u ON u.id = i.user_id
      JOIN courses c ON c.instructor_id = i.id
      JOIN enrolments e ON c.id = e.course_id
      JOIN payments p ON e.id::text = p.enrolment_id
      WHERE COALESCE(p.payment_status, p.status) IN ('paid', 'success', 'captured')
      GROUP BY u.id
      ORDER BY total_generated DESC
      LIMIT 10
    `;
    const instructorsRes = await pool.query(instructorsQuery);

    // Failed Payment Trends
    const failedQuery = `
      SELECT TO_CHAR(DATE(created_at), 'Mon DD') as date, COUNT(*) as failed_count
      FROM payments
      WHERE COALESCE(payment_status, status) = 'failed'
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) DESC
      LIMIT 10
    `;
    const failedRes = await pool.query(failedQuery);

    // Category Breakdown
    const categoryQuery = `
      SELECT cat.name, SUM(p.amount) as revenue
      FROM categories cat
      JOIN courses c ON c.category_id = cat.id
      JOIN enrolments e ON c.id = e.course_id
      JOIN payments p ON e.id::text = p.enrolment_id
      WHERE COALESCE(p.payment_status, p.status) IN ('paid', 'success', 'captured')
      GROUP BY cat.id
      ORDER BY revenue DESC
      LIMIT 5
    `;
    const categoryRes = await pool.query(categoryQuery);

    // Payment Methods
    const methodsQuery = `
      SELECT payment_method as method, COUNT(*) as value
      FROM payments
      WHERE payment_method IS NOT NULL
      GROUP BY payment_method
      ORDER BY value DESC
      LIMIT 5
    `;
    const methodsRes = await pool.query(methodsQuery);

    // Revenue Split & Forecast Data (Based on real aggregates)
    const splitQuery = `
      SELECT 
        SUM(amount) as gross_revenue,
        SUM(COALESCE(net_amount, amount)) as net_revenue,
        SUM(tax_amount) as total_tax,
        SUM(gateway_fee) as total_fees
      FROM payments
      WHERE COALESCE(payment_status, status) IN ('paid', 'success', 'captured')
    `;
    const splitRes = await pool.query(splitQuery);
    const totals = splitRes.rows[0] || { gross_revenue: 0, net_revenue: 0, total_tax: 0, total_fees: 0 };
    
    const gross = Number(totals.gross_revenue) || 0;
    const taxes = Number(totals.total_tax) || 0;
    const pending = Number(totals.total_fees) || 0;
    const instructorCut = gross * 0.6; // Assuming 60% instructor share
    const platformNet = gross - taxes - pending - instructorCut;

    const payload = {
      topCourses: coursesRes.rows,
      instructorLeaderboard: instructorsRes.rows,
      failedTrends: failedRes.rows.reverse(),
      categoryData: categoryRes.rows.map(row => ({ name: row.name, revenue: Number(row.revenue) || 0 })),
      paymentMethodData: methodsRes.rows.map(row => ({ name: row.method || 'Unknown', value: Number(row.value) || 0 })),
      revenueSplit: {
        platform: gross > 0 ? (platformNet / gross) * 100 : 30,
        instructors: gross > 0 ? (instructorCut / gross) * 100 : 60,
        taxes: gross > 0 ? (taxes / gross) * 100 : 7,
        pending: gross > 0 ? (pending / gross) * 100 : 3,
        platformAbs: platformNet,
        instructorAbs: instructorCut,
        taxAbs: taxes,
        pendingAbs: pending
      },
      forecast: {
        predicted: gross * 1.15, // Simple 15% growth forecast based on current real data
        confidence: 85
      },
      insights: gross > 0 ? [
        { type: 'trend', text: `Gross revenue currently stands at ₹${gross.toLocaleString()}.` },
        { type: 'alert', text: `Instructor payouts account for ₹${instructorCut.toLocaleString()} of total volume.` },
        { type: 'info', text: `Tax deductions and gateway fees make up ${(((taxes + pending)/gross)*100).toFixed(1)}% of revenue.` }
      ] : [
        { type: 'info', text: "No revenue generated yet. Start marketing your courses to see insights here." },
        { type: 'trend', text: "Your dashboard is ready to track sales." }
      ]
    };

    await pool.query(`
      INSERT INTO analytics_cache (cache_key, data, expires_at)
      VALUES ($1, $2, NOW() + INTERVAL '10 minutes')
      ON CONFLICT (cache_key) DO UPDATE 
      SET data = EXCLUDED.data, expires_at = EXCLUDED.expires_at, updated_at = NOW()
    `, [cacheKey, JSON.stringify(payload)]);

    return NextResponse.json(payload);
  } catch (err: any) {
    console.error('API Deep Analytics Error:', err);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
