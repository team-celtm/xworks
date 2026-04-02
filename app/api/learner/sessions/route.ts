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
        sr.status as "regStatus",
        ls.id as "sessionId",
        ls.title as "sessionTitle",
        ls.scheduled_start as "scheduledStart",
        ls.scheduled_end as "scheduledEnd",
        ls.join_url as "joinUrl",
        ls.platform,
        c.name as "courseName",
        c.emoji,
        c.g as "thumbBg"
      FROM session_registrations sr
      JOIN live_sessions ls ON sr.session_id = ls.id
      JOIN enrolments e ON sr.enrolment_id = e.id
      JOIN courses c ON ls.course_id = c.id
      WHERE e.user_id = $1 
        AND ls.scheduled_start >= NOW() - INTERVAL '1 hour'
        AND ls.status != 'cancelled'
      ORDER BY ls.scheduled_start ASC
    `;
    const { rows } = await pool.query(sql, [userId]);

    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Learner Sessions API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
