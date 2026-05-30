import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { jwtVerify } from 'jose';
import { createNotification } from '@/lib/notifications';

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
      SELECT ls.id, ls.status, ls.scheduled_start, ls.scheduled_end, ls.host_url, ls.title as "session_title", c.name as "course_name"
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
      SELECT sa.user_id, u.email, u.first_name, SUM(sa.duration_seconds) as total_duration
      FROM session_attendance sa
      JOIN users u ON sa.user_id = u.id
      WHERE sa.session_id = $1
      GROUP BY sa.user_id, u.email, u.first_name
      HAVING SUM(sa.duration_seconds) >= $2
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
        // 2. Mark course enrolment as completed (fix enrolment_status column bug to status)
        await pool.query(`
          UPDATE enrolments 
          SET status = 'completed', 
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

        // Notify Student
        await createNotification({
          userId: row.user_id,
          title: 'Course Completed! 🎓',
          message: `Congratulations! You have completed the course "${sessionInfo.course_name}" and your certificate has been generated.`,
          type: 'success',
          sendEmail: true,
          emailTo: row.email,
          emailSubject: `Course Completed: ${sessionInfo.course_name}`,
          emailHtml: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h2 style="color: #4F46E5;">Congratulations! 🎓</h2>
              <p>Hi ${row.first_name},</p>
              <p>You have successfully completed the course <strong>${sessionInfo.course_name}</strong> by attending at least 80% of the live session.</p>
              <p>Your completion certificate has been generated.</p>
              <a href="${req.nextUrl.origin}/dashboard?view=certificates" style="display: inline-block; background: #C74A4A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">View Certificate</a>
            </div>
          `
        });
      }
    }

    // Notify Instructor
    await createNotification({
      userId: userId,
      title: 'Session Completed ⏺',
      message: `Your session "${sessionInfo.session_title}" for course "${sessionInfo.course_name}" has ended. Attendance has been processed for all learners.`,
      type: 'info'
    });


    return NextResponse.json({ success: true, eligibleCount: eligibleStudents.rowCount }, { status: 200 });
  } catch (error) {
    console.error('Instructor End Session API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
