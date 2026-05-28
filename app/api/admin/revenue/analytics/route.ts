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

    const payload = {
      topCourses: coursesRes.rows,
      instructorLeaderboard: instructorsRes.rows,
      failedTrends: failedRes.rows.reverse()
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
