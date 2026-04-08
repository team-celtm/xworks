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

    const sql = `
      SELECT 
        ls.id as "sessionId",
        ls.title as "sessionTitle",
        ls.scheduled_start as "scheduledStart",
        ls.status as "sessionStatus",
        c.name as "courseName",
        COUNT(sr.id) as "registrantCount"
      FROM live_sessions ls
      JOIN courses c ON ls.course_id = c.id
      JOIN instructors i ON c.instructor_id = i.id
      LEFT JOIN session_registrations sr ON sr.session_id = ls.id
      WHERE i.user_id = $1
      GROUP BY ls.id, c.name
      ORDER BY ls.scheduled_start DESC
    `;
    const { rows } = await pool.query(sql, [userId]);

    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Instructor Sessions API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
