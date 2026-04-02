import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { jwtVerify } from 'jose';

const SESSION_SECRET = process.env.SESSION_SECRET || 'your-default-secret-change-me';

export async function GET(req: NextRequest) {
  try {
    const accessToken = req.cookies.get('access_token')?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify JWT
    let payload: any;
    try {
      const { payload: jwtPayload } = await jwtVerify(
        accessToken,
        new TextEncoder().encode(SESSION_SECRET)
      );
      payload = jwtPayload;
    } catch (err) {
      console.error('JWT verification failed:', err);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = payload.id;

    // Fetch enrolments with course and session info
    const sql = `
      SELECT 
        e.id as enrolment_id,
        e.progress_pct as "progressPct",
        e.status as enrolment_status,
        e.enrolled_at as "enrolledAt",
        e.completed_at as "completedAt",
        c.id as course_id,
        c.name,
        c.slug,
        c.emoji,
        c.g as "thumbBg",
        c.live,
        c.dur,
        c.rating,
        cat.name as "catLabel",
        (u.first_name || ' ' || u.last_name) as instructor,
        ls.scheduled_start as "scheduledStart",
        ls.scheduled_end as "scheduledEnd",
        ls.status as "sessionStatus"
      FROM enrolments e
      JOIN courses c ON e.course_id = c.id
      JOIN categories cat ON c.category_id = cat.id
      JOIN instructors i ON c.instructor_id = i.id
      JOIN users u ON i.user_id = u.id
      LEFT JOIN LATERAL (
        SELECT scheduled_start, scheduled_end, status
        FROM live_sessions
        WHERE course_id = c.id AND scheduled_start >= NOW()
        ORDER BY scheduled_start ASC
        LIMIT 1
      ) ls ON true
      WHERE e.user_id = $1
      ORDER BY e.enrolled_at DESC
    `;

    const { rows } = await pool.query(sql, [userId]);

    // Format numbers
    const payloadResult = rows.map(r => ({
      ...r,
      progressPct: parseFloat(r.progressPct),
      dur: parseInt(r.dur, 10),
      rating: parseFloat(r.rating)
    }));

    return NextResponse.json(payloadResult, { status: 200 });
  } catch (error) {
    console.error('API Error /learner/enrolments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
