import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { jwtVerify } from 'jose';

const SESSION_SECRET = process.env.SESSION_SECRET || 'your-default-secret-change-me';

export async function GET(req: NextRequest) {
  try {
    const accessToken = req.cookies.get('access_token')?.value;
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { payload } = await jwtVerify(accessToken, new TextEncoder().encode(SESSION_SECRET));
    const userId = (payload as any).id;

    const userCheck = await pool.query('SELECT status FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0 || userCheck.rows[0].status === 'suspended') {
      return NextResponse.json({ error: 'Your account is suspended. Please contact support.' }, { status: 403 });
    }

    const instructorRes = await pool.query('SELECT id FROM instructors WHERE user_id = $1', [userId]);
    if (instructorRes.rows.length === 0) {
      return NextResponse.json({ error: 'Not an instructor' }, { status: 403 });
    }
    const instructorId = instructorRes.rows[0].id;

    const coursesRes = await pool.query(`
      SELECT COUNT(id) FROM courses 
      WHERE instructor_id = $1 AND LOWER(status) != 'deleted'
    `, [instructorId]);
    const totalCourses = parseInt(coursesRes.rows[0].count, 10);

    const statsRes = await pool.query(`
      SELECT 
        COUNT(e.id) as total_sales,
        COUNT(DISTINCT e.user_id) as total_students,
        COALESCE(SUM(CASE WHEN NOT EXISTS (SELECT 1 FROM payments p WHERE p.enrolment_id = e.id::text AND p.status IN ('refunded', 'failed')) THEN e.price_paid_paise ELSE 0 END), 0) as gross_revenue_paise,
        COALESCE(SUM(CASE WHEN EXISTS (SELECT 1 FROM payments p WHERE p.enrolment_id = e.id::text AND p.status = 'refunded') THEN e.price_paid_paise ELSE 0 END), 0) as refund_amount_paise,
        COALESCE(SUM(CASE WHEN e.enrolled_at >= date_trunc('month', CURRENT_DATE) AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.enrolment_id = e.id::text AND p.status IN ('refunded', 'failed')) THEN e.price_paid_paise ELSE 0 END), 0) as monthly_revenue_paise,
        COALESCE(SUM(CASE WHEN e.enrolled_at >= date_trunc('week', CURRENT_DATE) AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.enrolment_id = e.id::text AND p.status IN ('refunded', 'failed')) THEN e.price_paid_paise ELSE 0 END), 0) as weekly_revenue_paise
      FROM enrolments e
      JOIN courses c ON e.course_id = c.id
      WHERE c.instructor_id = $1
    `, [instructorId]);

    const statsRow = statsRes.rows[0];
    const grossRevenue = Math.max(0, parseInt(statsRow.gross_revenue_paise, 10) / 100); // Prevent negative
    const netEarnings = Math.max(0, grossRevenue * 0.8);
    const platformFee = Math.max(0, grossRevenue * 0.2);
    
    // Get total withdrawn
    const withdrawnRes = await pool.query(`
      SELECT COALESCE(SUM(amount_paise), 0) as total_withdrawn
      FROM payout_requests
      WHERE instructor_id = $1 AND status != 'Failed'
    `, [instructorId]);
    const totalWithdrawnPaise = parseInt(withdrawnRes.rows[0].total_withdrawn, 10);
    const totalWithdrawn = totalWithdrawnPaise / 100;

    const pendingPayout = Math.max(0, netEarnings - totalWithdrawn);
    
    // Time-series data for last 30 days
    const chartRes = await pool.query(`
      SELECT 
        date_trunc('day', e.enrolled_at) as day,
        COALESCE(SUM(e.price_paid_paise), 0) as daily_paise
      FROM enrolments e
      JOIN courses c ON e.course_id = c.id
      WHERE c.instructor_id = $1
      AND e.enrolled_at >= CURRENT_DATE - INTERVAL '30 days'
      AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.enrolment_id = e.id::text AND p.status IN ('refunded', 'failed'))
      GROUP BY day
      ORDER BY day ASC
    `, [instructorId]);

    const rawChartData = chartRes.rows.map(row => ({
      date: new Date(row.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: Math.max(0, (parseInt(row.daily_paise, 10) * 0.8) / 100)
    }));

    // EDGE CASE: Recharts line chart looks broken if there are missing days (e.g. no sales for a week).
    // We must generate a padded 30-day array to ensure the x-axis is perfectly continuous.
    const revenueChart = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const existing = rawChartData.find(c => c.date === dateStr);
      revenueChart.push({
        date: dateStr,
        revenue: existing ? existing.revenue : 0
      });
    }

    // Course performance data
    const performanceRes = await pool.query(`
      SELECT 
        c.name,
        COUNT(e.id) as sales,
        COALESCE(SUM(e.price_paid_paise), 0) as course_revenue_paise
      FROM courses c
      LEFT JOIN enrolments e ON c.id = e.course_id 
        AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.enrolment_id = e.id::text AND p.status IN ('refunded', 'failed'))
      WHERE c.instructor_id = $1 AND LOWER(c.status) != 'deleted'
      GROUP BY c.id, c.name
      ORDER BY course_revenue_paise DESC
      LIMIT 5
    `, [instructorId]);

    const coursePerformance = performanceRes.rows.map(row => ({
      name: row.name,
      sales: parseInt(row.sales, 10),
      revenue: (parseInt(row.course_revenue_paise, 10) * 0.8) / 100
    }));

    const txRes = await pool.query(`
      SELECT 
        e.id as transaction_id,
        c.name as course_name, 
        e.price_paid_paise as amount_paise, 
        e.enrolled_at,
        u.first_name,
        u.last_name,
        (SELECT status FROM payments p WHERE p.enrolment_id = e.id::text LIMIT 1) as payment_status
      FROM enrolments e
      JOIN courses c ON e.course_id = c.id
      JOIN users u ON e.user_id = u.id
      WHERE c.instructor_id = $1
      ORDER BY e.enrolled_at DESC
      LIMIT 20
    `, [instructorId]);

    const transactions = txRes.rows.map(row => {
      const gross = parseInt(row.amount_paise, 10) / 100;
      return {
        id: row.transaction_id,
        courseName: row.course_name,
        grossAmount: gross,
        instructorShare: gross * 0.8,
        platformFee: gross * 0.2,
        status: row.payment_status || 'successful',
        enrolledAt: row.enrolled_at,
        studentName: `${row.first_name} ${row.last_name}`.trim()
      };
    });

    return NextResponse.json({
      success: true,
      stats: {
        total_courses: totalCourses,
        total_sales: parseInt(statsRow.total_sales, 10),
        total_students: parseInt(statsRow.total_students, 10),
        gross_revenue: grossRevenue,
        net_earnings: netEarnings,
        platform_fee: platformFee,
        pending_payout: pendingPayout,
        refund_amount: parseInt(statsRow.refund_amount_paise, 10) / 100,
        monthly_revenue: (parseInt(statsRow.monthly_revenue_paise, 10) * 0.8) / 100,
        weekly_revenue: (parseInt(statsRow.weekly_revenue_paise, 10) * 0.8) / 100
      },
      charts: {
        revenueChart,
        coursePerformance
      },
      transactions
    }, { status: 200 });

  } catch (error) {
    console.error('Instructor Stats API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
