import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { jwtVerify } from 'jose';
import { createNotification } from '@/lib/notifications';
import { sendMail } from '@/lib/mail';


const SESSION_SECRET = process.env.SESSION_SECRET || 'your-default-secret-change-me';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const regId = (await params).id;
    const { newSessionId } = await req.json();
    const accessToken = req.cookies.get('access_token')?.value;

    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { payload } = await jwtVerify(accessToken, new TextEncoder().encode(SESSION_SECRET));
    const userId = (payload as any).id;

    // 1. Get current registration details
    const regRes = await pool.query(`
      SELECT sr.*, e.user_id 
      FROM session_registrations sr
      JOIN enrolments e ON sr.enrolment_id = e.id
      WHERE sr.id = $1::uuid
    `, [regId]);

    if (regRes.rows.length === 0) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    const currentReg = regRes.rows[0];

    // Security check: ensure the registration belongs to the user
    if (currentReg.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (currentReg.session_id === newSessionId) {
       return NextResponse.json({ error: 'Already registered for this session' }, { status: 400 });
    }

    // 1.5. Validate selected session slot
    const newSessionRes = await pool.query(`
      SELECT s.course_id, s.scheduled_start, s.status, s.max_seats, s.registered_count, c.name as course_name, s.title as session_title
      FROM live_sessions s
      JOIN courses c ON s.course_id = c.id
      WHERE s.id = $1::uuid
    `, [newSessionId]);

    if (newSessionRes.rows.length === 0) {
      return NextResponse.json({ error: 'Selected session not found' }, { status: 404 });
    }

    const newSession = newSessionRes.rows[0];

    // Get current enrolment's course_id to verify matching course
    const enrolmentRes = await pool.query(`
      SELECT course_id FROM enrolments WHERE id = $1::uuid
    `, [currentReg.enrolment_id]);
    const enrolmentCourseId = enrolmentRes.rows[0]?.course_id;

    if (newSession.course_id !== enrolmentCourseId) {
      return NextResponse.json({ error: 'Cannot reschedule to a session of a different course' }, { status: 400 });
    }

    if (new Date(newSession.scheduled_start).getTime() <= Date.now()) {
      return NextResponse.json({ error: 'Selected session slot has expired' }, { status: 400 });
    }

    if (newSession.status === 'cancelled') {
      return NextResponse.json({ error: 'Selected session slot has been cancelled' }, { status: 400 });
    }

    if (newSession.max_seats !== null && newSession.registered_count >= newSession.max_seats) {
      return NextResponse.json({ error: 'Selected session slot is full' }, { status: 400 });
    }


    // 2. Transaction to update seats and session
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Decrement old session
      await client.query('UPDATE live_sessions SET registered_count = registered_count - 1 WHERE id = $1::uuid', [currentReg.session_id]);

      // Update registration to new session
      await client.query('UPDATE session_registrations SET session_id = $1::uuid, registered_at = NOW() WHERE id = $2::uuid', [newSessionId, regId]);

      // Increment new session
      await client.query('UPDATE live_sessions SET registered_count = registered_count + 1 WHERE id = $1::uuid', [newSessionId]);

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    // 3. Send confirmations and notifications
    const userEmail = (payload as any).email;
    const userName = (payload as any).first_name || 'Learner';

    // Student notification
    await createNotification({
      userId,
      title: 'Session Rescheduled 📅',
      message: `You've successfully rescheduled your live class for "${newSession.course_name}" to ${new Date(newSession.scheduled_start).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}.`,
      type: 'info',
      sendEmail: true,
      emailTo: userEmail,
      emailSubject: `Rescheduling Confirmed: ${newSession.course_name}`,
      emailHtml: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #4F46E5;">Rescheduling Confirmed! 📅</h2>
          <p>Hi ${userName},</p>
          <p>You have successfully rescheduled your live session of <strong>${newSession.course_name}</strong>.</p>
          <div style="background: #F8F9FF; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>New Session:</strong> ${newSession.session_title || 'Live Workshop'}</p>
            <p style="margin: 5px 0;"><strong>New Date/Time:</strong> ${new Date(newSession.scheduled_start).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })}</p>
          </div>
          <p>The join link will be activated in your dashboard 10 minutes before the start time.</p>
          <a href="${req.nextUrl.origin}/dashboard" style="display: inline-block; background: #C74A4A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">Go to Dashboard</a>
        </div>
      `
    });

    // Instructor Notification
    const instructorRes = await pool.query(`
      SELECT i.user_id
      FROM instructors i
      JOIN courses c ON c.instructor_id = i.id
      WHERE c.id = $1::uuid
    `, [enrolmentCourseId]);

    if (instructorRes.rows.length > 0) {
      const instructorUserId = instructorRes.rows[0].user_id;
      await createNotification({
        userId: instructorUserId,
        title: 'Student Rescheduled Session 📅',
        message: `A learner has rescheduled into your session "${newSession.session_title}" for course "${newSession.course_name}".`,
        type: 'info'
      });
    }

    return NextResponse.json({ success: true, message: 'Session rescheduled successfully' });

  } catch (error: any) {
    console.error('Reschedule API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
