import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { jwtVerify } from 'jose';

const SESSION_SECRET = process.env.SESSION_SECRET || 'your-default-secret-change-me';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const accessToken = req.cookies.get('access_token')?.value;
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { payload } = await jwtVerify(accessToken, new TextEncoder().encode(SESSION_SECRET));
    const userId = (payload as any).id;
    const { id: sessionId } = await params;

    // Verify ownership and check status
    const checkSql = `
      SELECT ls.id, ls.status, ls.scheduled_start, ls.host_url
      FROM live_sessions ls
      JOIN courses c ON ls.course_id = c.id
      JOIN instructors i ON c.instructor_id = i.id
      WHERE ls.id = $1 AND i.user_id = $2
    `;
    const { rows } = await pool.query(checkSql, [sessionId, userId]);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Forbidden or session not found' }, { status: 403 });
    }
    
    const sessionInfo = rows[0];

    if (sessionInfo.status === 'cancelled') {
      return NextResponse.json({ error: 'Cannot end a cancelled session' }, { status: 400 });
    }
    
    if (sessionInfo.status === 'completed' || sessionInfo.status === 'expired') {
      return NextResponse.json({ error: 'Session is already ended' }, { status: 400 });
    }

    if (!sessionInfo.host_url) {
      return NextResponse.json({ error: 'Cannot end a session that was never started' }, { status: 400 });
    }

    // End the session
    const updateSql = `
      UPDATE live_sessions 
      SET status = 'completed', updated_at = NOW()
      WHERE id = $1
      RETURNING course_id
    `;
    const endRes = await pool.query(updateSql, [sessionId]);
    const courseId = endRes.rows[0].course_id;

    // Auto-calculate student attendance and close active tracking
    await pool.query(`
      UPDATE session_attendance
      SET leave_time = NOW(),
          duration_seconds = EXTRACT(EPOCH FROM (NOW() - join_time)),
          status = 'attended'
      WHERE session_id = $1 AND leave_time IS NULL
    `, [sessionId]);

    // Compute threshold and mark enrolments as completed
    // Calculate expected duration based on scheduled start and end
    const expectedDurationMs = sessionInfo.scheduled_end ? new Date(sessionInfo.scheduled_end).getTime() - new Date(sessionInfo.scheduled_start).getTime() : 3600000;
    const thresholdSecs = (expectedDurationMs / 1000) * 0.8; // 80% attendance required

    const eligibleStudents = await pool.query(`
      SELECT user_id, SUM(duration_seconds) as total_duration
      FROM session_attendance
      WHERE session_id = $1
      GROUP BY user_id
      HAVING SUM(duration_seconds) >= $2
    `, [sessionId, thresholdSecs]);

    for (const row of eligibleStudents.rows) {
      // 1. Update session registration attendance status
      const regRes = await pool.query(`
        UPDATE session_registrations
        SET attendance_status = 'attended', completion_pct = 100
        WHERE session_id = $1 AND enrolment_id IN (
          SELECT id FROM enrolments WHERE user_id = $2 AND course_id = $3
        )
        RETURNING enrolment_id
      `, [sessionId, row.user_id, courseId]);

      if (regRes.rows.length > 0) {
        const enrolmentId = regRes.rows[0].enrolment_id;
        // 2. Mark course enrolment as completed
        await pool.query(`
          UPDATE enrolments 
          SET enrolment_status = 'completed', 
              completed_at = NOW(), 
              progress_pct = 100 
          WHERE id = $1
        `, [enrolmentId]);

        // 3. Issue certificate idempotently
        await pool.query(`
          INSERT INTO certificates (credential_id, user_id, course_id, enrolment_id, status)
          VALUES (
            'XW-' || substr(md5(random()::text), 1, 8),
            $1, $2, $3, 'issued'
          )
          ON CONFLICT (enrolment_id) DO NOTHING
        `, [row.user_id, courseId, enrolmentId]);
      }
    }

    return NextResponse.json({ success: true, eligibleCount: eligibleStudents.rowCount }, { status: 200 });
  } catch (error) {
    console.error('Instructor End Session API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
