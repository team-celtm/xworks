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

    // 1. Get instructor ID
    const instructorRes = await pool.query('SELECT id FROM instructors WHERE user_id = $1', [userId]);
    if (instructorRes.rows.length === 0) {
      return NextResponse.json({ error: 'Not an instructor' }, { status: 403 });
    }
    const instructorId = instructorRes.rows[0].id;

    // 2. Total Courses (excluding deleted)
    const coursesRes = await pool.query(`
      SELECT COUNT(id) FROM courses 
      WHERE instructor_id = $1 AND LOWER(status) != 'deleted'
    `, [instructorId]);
    const totalCourses = parseInt(coursesRes.rows[0].count, 10);

    // 3. Pending Payout (80% of total enrolments revenue, excluding refunded/failed)
    const payoutRes = await pool.query(`
      SELECT COALESCE(SUM(e.price_paid_paise), 0) as total_paise
      FROM enrolments e
      JOIN courses c ON e.course_id = c.id
      WHERE c.instructor_id = $1
      AND NOT EXISTS (
        SELECT 1 FROM payments p 
        WHERE p.enrolment_id = e.id::text AND p.status IN ('refunded', 'failed')
      )
    `, [instructorId]);
    const totalPaise = parseInt(payoutRes.rows[0].total_paise, 10);
    const pendingPayout = (totalPaise * 0.8) / 100; // 80% split

    // 4. Recent Transactions (excluding refunded/failed)
    const txRes = await pool.query(`
      SELECT 
        c.name as course_name, 
        e.price_paid_paise as amount_paise, 
        e.enrolled_at,
        u.first_name,
        u.last_name
      FROM enrolments e
      JOIN courses c ON e.course_id = c.id
      JOIN users u ON e.user_id = u.id
      WHERE c.instructor_id = $1
      AND NOT EXISTS (
        SELECT 1 FROM payments p 
        WHERE p.enrolment_id = e.id::text AND p.status IN ('refunded', 'failed')
      )
      ORDER BY e.enrolled_at DESC
      LIMIT 20
    `, [instructorId]);

    const transactions = txRes.rows.map(row => ({
      courseName: row.course_name,
      amountEarned: (parseInt(row.amount_paise, 10) * 0.8) / 100,
      enrolledAt: row.enrolled_at,
      studentName: `${row.first_name} ${row.last_name}`.trim()
    }));

    return NextResponse.json({
      success: true,
      stats: {
        total_courses: totalCourses,
        pending_payout: pendingPayout
      },
      transactions
    }, { status: 200 });

  } catch (error) {
    console.error('Instructor Stats API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
