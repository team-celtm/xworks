import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { jwtVerify } from 'jose';

const SESSION_SECRET = process.env.SESSION_SECRET || 'your-default-secret-change-me';

async function getInstructorId(req: NextRequest) {
  const accessToken = req.cookies.get('access_token')?.value;
  if (!accessToken) return null;

  try {
    const { payload } = await jwtVerify(accessToken, new TextEncoder().encode(SESSION_SECRET));
    const userId = payload.id;
    const instructor = await pool.query('SELECT id FROM instructors WHERE user_id = $1', [userId]);
    return instructor.rows[0]?.id || null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const instructorId = await getInstructorId(req);
    if (!instructorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { rows } = await pool.query(`
      SELECT 
        c.id as course_id, 
        c.name as course_name, 
        COALESCE(SUM(p.amount), 0) as revenue
      FROM courses c
      LEFT JOIN enrolments e ON e.course_id = c.id
      LEFT JOIN payments p ON p.enrolment_id::uuid = e.id AND p.status = 'captured'
      WHERE c.instructor_id = $1
      GROUP BY c.id, c.name
      ORDER BY revenue DESC
    `, [instructorId]);

    const totalRevenue = rows.reduce((acc, row) => acc + Number(row.revenue), 0);

    return NextResponse.json({
      courses: rows,
      totalPendingPayout: totalRevenue // Simplified payout approximation
    }, { status: 200 });
  } catch (error) {
    console.error('API Error /teach/earnings GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
