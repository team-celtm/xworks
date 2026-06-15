import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { jwtVerify } from 'jose';
import { createNotification } from '@/lib/notifications';
import { validateMeetingLink } from '@/lib/meetingLink';


const SESSION_SECRET = process.env.SESSION_SECRET!;

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const accessToken = req.cookies.get('access_token')?.value;
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { payload } = await jwtVerify(accessToken, new TextEncoder().encode(SESSION_SECRET));
    const userId = (payload as any).id;
    const { id: sessionId } = await params;

    const userCheck = await pool.query('SELECT status FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0 || userCheck.rows[0].status === 'suspended') {
      return NextResponse.json({ error: 'Your account is suspended. Please contact support.' }, { status: 403 });
    }

    // Verify ownership, status, expiry, and registrant count
    const ownershipRes = await pool.query(`
      SELECT ls.id, ls.status, ls.scheduled_start, ls.scheduled_end, ls.max_seats, ls.title, ls.host_url, ls.course_id,
             c.status as course_status, c.name as course_name, c.instructor_id,
             (SELECT COUNT(*) FROM session_registrations sr WHERE sr.session_id = ls.id) as registrant_count
      FROM live_sessions ls
      JOIN courses c ON ls.course_id = c.id
      JOIN instructors i ON c.instructor_id = i.id
      WHERE ls.id = $1 AND i.user_id = $2
    `, [sessionId, userId]);

    if (ownershipRes.rows.length === 0) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    }

    const session = ownershipRes.rows[0];

    const { hostUrl, forceStart } = await req.json();

    // Link Validation Engine
    const valResult = validateMeetingLink(hostUrl);
    if (!valResult.isValid) {
      return NextResponse.json({ error: valResult.error }, { status: 400 });
    }
    const sanitizedUrl = valResult.sanitizedUrl || hostUrl;

    // Distinguish starting vs updating session
    const isUpdate = session.status === 'live' || (session.host_url !== null);

    // State machine checks
    if (session.status === 'cancelled') {
      const errMsg = isUpdate ? 'Cancelled sessions cannot be modified.' : 'Cancelled sessions cannot be started.';
      return NextResponse.json({ error: errMsg }, { status: 400 });
    }
    
    if (session.status === 'completed') {
      const errMsg = isUpdate ? 'Completed sessions cannot be modified.' : 'Completed sessions cannot be restarted.';
      return NextResponse.json({ error: errMsg }, { status: 400 });
    }

    if (session.status === 'expired') {
      const errMsg = isUpdate ? 'Archived sessions cannot be modified.' : 'This session has already expired.';
      return NextResponse.json({ error: errMsg }, { status: 400 });
    }

    // Duplicate link guard
    if (session.host_url === sanitizedUrl) {
      return NextResponse.json({ error: 'This meeting link is already being used.' }, { status: 400 });
    }

    // Unpublished Course Validation
    if (session.course_status !== 'published') {
      return NextResponse.json({ error: 'Cannot start a session for an unpublished course.' }, { status: 400 });
    }

    // Capacity = 0 check
    if (session.max_seats === 0) {
      console.error(`[CONFIGURATION ERROR] Session ${sessionId} has max_seats=0.`);
      return NextResponse.json({ error: 'Session capacity is 0. Cannot start session.' }, { status: 400 });
    }

    const scheduledStart = new Date(session.scheduled_start).getTime();
    const scheduledEnd = session.scheduled_end ? new Date(session.scheduled_end).getTime() : scheduledStart + (60 * 60 * 1000);
    const gracePeriodMs = parseInt(process.env.SESSION_GRACE_PERIOD_MINUTES || '10') * 60 * 1000;

    // Only prevent starting if it's not already live and the time has expired
    if (session.status !== 'live' && Date.now() > scheduledEnd + gracePeriodMs) {
      return NextResponse.json({ error: 'This session has already expired.' }, { status: 400 });
    }

    // Zero Registration Protection Logic
    if (session.status !== 'live' && parseInt(session.registrant_count) === 0) {
      const allowEmpty = process.env.ALLOW_EMPTY_SESSION_START === 'true';
      if (!allowEmpty) {
        return NextResponse.json({ error: 'Cannot start session because no learners are registered.' }, { status: 400 });
      }
      if (!forceStart) {
        return NextResponse.json({ error: 'Session has no learners. Confirm start?', code: 'ZERO_REGISTRATIONS_CONFIRM' }, { status: 409 });
      }
      // Audit log the forced empty start
      console.log(`[AUDIT LOG] Instructor (User ID: ${userId}) forced start of session ${sessionId} with 0 registrations.`);
    }

    // Update the host_url, join_url, and set status to live
    await pool.query(`
      UPDATE live_sessions 
      SET host_url = $1, join_url = $1, status = 'live', updated_at = NOW() 
      WHERE id = $2
    `, [sanitizedUrl, sessionId]);

    // Dispatch LIVE / Link Update notifications to students
    const registrantsRes = await pool.query(`
      SELECT u.id as user_id, u.email, u.first_name
      FROM session_registrations sr
      JOIN enrolments e ON sr.enrolment_id = e.id
      JOIN users u ON e.user_id = u.id
      WHERE sr.session_id = $1
    `, [sessionId]);

    const isLiveUpdate = session.status === 'live';
    const notificationTitle = isLiveUpdate ? 'Session Link Updated 🔄' : 'Session LIVE! 🔴';
    const notificationMsg = isLiveUpdate
      ? `Session meeting link has been updated by the instructor.`
      : `The live session "${session.title}" for your course "${session.course_name}" is now LIVE! Click here to join.`;

    for (const reg of registrantsRes.rows) {
      await createNotification({
        userId: reg.user_id,
        title: notificationTitle,
        message: notificationMsg,
        type: isLiveUpdate ? 'info' : 'warning',
        sendEmail: true,
        emailTo: reg.email,
        emailSubject: isLiveUpdate ? `Link Updated: ${session.title}` : `LIVE NOW: ${session.title}`,
        emailHtml: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: ${isLiveUpdate ? '#3B82F6' : '#EF4444'};">${notificationTitle}</h2>
            <p>Hi ${reg.first_name},</p>
            <p>${notificationMsg}</p>
            <a href="${req.nextUrl.origin}/dashboard" style="display: inline-block; background: #C74A4A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">Go to Dashboard</a>
          </div>
        `
      });
    }

    // IP & Audit Logging
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'Unknown';
    const actionType = isLiveUpdate ? 'LINK_UPDATED' : 'SESSION_STARTED';
    const { logAdminAction } = await import('@/lib/audit');

    await logAdminAction(
      userId,
      actionType,
      'live_session',
      sessionId,
      { host_url: session.host_url },
      {
        session_id: sessionId,
        course_id: session.course_id,
        instructor_id: session.instructor_id,
        old_link: session.host_url,
        new_link: sanitizedUrl,
        action_type: actionType,
        timestamp: new Date().toISOString(),
        ip_address: ipAddress
      },
      ipAddress
    );

    return NextResponse.json({ success: true, hostUrl: sanitizedUrl }, { status: 200 });


  } catch (error) {
    console.error('Update Host URL API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
