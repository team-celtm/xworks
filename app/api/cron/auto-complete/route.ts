import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    // Only allow local calls or specific secret token (for production)
    // For simplicity here, we assume it's hit internally

    const gracePeriodMs = 3 * 60 * 60 * 1000; // 3 hours after scheduled end
    
    // Find all orphaned live sessions
    const orphanedSql = `
      SELECT id, course_id, scheduled_start, scheduled_end
      FROM live_sessions
      WHERE status = 'live'
      AND (
        (scheduled_end IS NOT NULL AND NOW() > (scheduled_end + interval '1 millisecond' * $1))
        OR
        (scheduled_end IS NULL AND NOW() > (scheduled_start + interval '4 hours'))
      )
    `;
    const orphaned = await pool.query(orphanedSql, [gracePeriodMs]);

    let processedCount = 0;

    for (const session of orphaned.rows) {
      const sessionId = session.id;
      const courseId = session.course_id;

      // 1. Mark as completed
      await pool.query(`UPDATE live_sessions SET status = 'completed', updated_at = NOW() WHERE id = $1`, [sessionId]);

      // 2. Auto-close attendance records
      await pool.query(`
        UPDATE session_attendance
        SET leave_time = NOW(),
            duration_seconds = EXTRACT(EPOCH FROM (NOW() - join_time)),
            status = 'attended'
        WHERE session_id = $1 AND leave_time IS NULL
      `, [sessionId]);

      // 3. Compute threshold and mark enrolments
      const expectedDurationMs = session.scheduled_end ? new Date(session.scheduled_end).getTime() - new Date(session.scheduled_start).getTime() : 3600000;
      const thresholdSecs = (expectedDurationMs / 1000) * 0.8;

      const eligibleStudents = await pool.query(`
        SELECT user_id, SUM(duration_seconds) as total_duration
        FROM session_attendance
        WHERE session_id = $1
        GROUP BY user_id
        HAVING SUM(duration_seconds) >= $2
      `, [sessionId, thresholdSecs]);

      for (const row of eligibleStudents.rows) {
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
          
          await pool.query(`
            UPDATE enrolments 
            SET enrolment_status = 'completed', 
                completed_at = NOW(), 
                progress_pct = 100 
            WHERE id = $1
          `, [enrolmentId]);

          await pool.query(`
            INSERT INTO certificates (credential_id, user_id, course_id, enrolment_id, status)
            VALUES ('XW-' || substr(md5(random()::text), 1, 8), $1, $2, $3, 'issued')
            ON CONFLICT (enrolment_id) DO NOTHING
          `, [row.user_id, courseId, enrolmentId]);
        }
      }
      processedCount++;
    }

    return NextResponse.json({ success: true, processedCount }, { status: 200 });
  } catch (error) {
    console.error('Auto-Complete Cron Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
