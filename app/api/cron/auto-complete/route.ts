import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { createNotification } from '@/lib/notifications';


export async function POST(req: NextRequest) {
  try {
    // Only allow local calls or specific secret token (for production)
    // For simplicity here, we assume it's hit internally

    const gracePeriodMs = 3 * 60 * 60 * 1000; // 3 hours after scheduled end
    
    // Find all orphaned live sessions
    const orphanedSql = `
      SELECT ls.id, ls.course_id, ls.scheduled_start, ls.scheduled_end, ls.title as session_title,
             c.name as course_name, i.user_id as instructor_user_id
      FROM live_sessions ls
      JOIN courses c ON ls.course_id = c.id
      JOIN instructors i ON c.instructor_id = i.id
      WHERE ls.status = 'live'
      AND (
        (ls.scheduled_end IS NOT NULL AND NOW() > (ls.scheduled_end + interval '1 millisecond' * $1))
        OR
        (ls.scheduled_end IS NULL AND NOW() > (ls.scheduled_start + interval '4 hours'))
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
        SELECT sa.user_id, u.email, u.first_name, SUM(sa.duration_seconds) as total_duration
        FROM session_attendance sa
        JOIN users u ON sa.user_id = u.id
        WHERE sa.session_id = $1
        GROUP BY sa.user_id, u.email, u.first_name
        HAVING SUM(sa.duration_seconds) >= $2
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
          
          // Fix enrolment_status column bug to status
          await pool.query(`
            UPDATE enrolments 
            SET status = 'completed', 
                completed_at = NOW(), 
                progress_pct = 100 
            WHERE id = $1
          `, [enrolmentId]);

          await pool.query(`
            INSERT INTO certificates (credential_id, user_id, course_id, enrolment_id, status)
            VALUES ('XW-' || substr(md5(random()::text), 1, 8), $1, $2, $3, 'issued')
            ON CONFLICT (enrolment_id) DO NOTHING
          `, [row.user_id, courseId, enrolmentId]);

          // Notify Student
          await createNotification({
            userId: row.user_id,
            title: 'Course Completed! 🎓',
            message: `Congratulations! You have completed the course "${session.course_name}" and your certificate has been generated.`,
            type: 'success',
            sendEmail: true,
            emailTo: row.email,
            emailSubject: `Course Completed: ${session.course_name}`,
            emailHtml: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #4F46E5;">Congratulations! 🎓</h2>
                <p>Hi ${row.first_name},</p>
                <p>You have successfully completed the course <strong>${session.course_name}</strong> by attending at least 80% of the live session.</p>
                <p>Your completion certificate has been generated.</p>
                <a href="${req.nextUrl.origin}/dashboard?view=certificates" style="display: inline-block; background: #C74A4A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">View Certificate</a>
              </div>
            `
          });
        }
      }

      // Notify Instructor
      if (session.instructor_user_id) {
        await createNotification({
          userId: session.instructor_user_id,
          title: 'Session Completed ⏺',
          message: `Your session "${session.session_title}" for course "${session.course_name}" has ended automatically. Attendance has been processed for all learners.`,
          type: 'info'
        });
      }

      processedCount++;
    }

    return NextResponse.json({ success: true, processedCount }, { status: 200 });
  } catch (error) {
    console.error('Auto-Complete Cron Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
