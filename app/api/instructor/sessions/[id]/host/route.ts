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

    const userCheck = await pool.query('SELECT status FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0 || userCheck.rows[0].status === 'suspended') {
      return NextResponse.json({ error: 'Your account is suspended. Please contact support.' }, { status: 403 });
    }

    // Verify ownership, status, expiry, and registrant count
    const ownershipRes = await pool.query(`
      SELECT ls.id, ls.status, ls.scheduled_start, ls.scheduled_end, ls.max_seats, ls.title,
             c.status as course_status, c.name as course_name,
             (SELECT COUNT(*) FROM session_registrations sr WHERE sr.session_id = ls.id) as registrant_count
      FROM live_sessions ls
      JOIN courses c ON ls.course_id = c.id
      JOIN instructors i ON c.instructor_id = i.id
      WHERE ls.id = $1 AND i.user_id = $2
    `, [sessionId, userId]);

    if (ownershipRes.rows.length === 0) {
      return NextResponse.json({ error: 'Session unavailable or not authorized' }, { status: 404 });
    }

    const session = ownershipRes.rows[0];

    // Unpublished Course Validation
    if (session.course_status !== 'published') {
      return NextResponse.json({ error: 'Cannot start a session for an unpublished course.' }, { status: 400 });
    }

    // Capacity = 0 check
    if (session.max_seats === 0) {
      console.error(`[CONFIGURATION ERROR] Session ${sessionId} has max_seats=0.`);
      return NextResponse.json({ error: 'Session capacity is 0. Cannot start session.' }, { status: 400 });
    }

    if (session.status === 'cancelled') {
      return NextResponse.json({ error: 'Cannot update a cancelled session' }, { status: 400 });
    }
    
    if (session.status === 'completed' || session.status === 'expired') {
      return NextResponse.json({ error: 'Cannot start or update a session that has already ended' }, { status: 400 });
    }


    const scheduledStart = new Date(session.scheduled_start).getTime();
    const scheduledEnd = session.scheduled_end ? new Date(session.scheduled_end).getTime() : scheduledStart + (60 * 60 * 1000);
    const gracePeriodMs = parseInt(process.env.SESSION_GRACE_PERIOD_MINUTES || '10') * 60 * 1000;

    // Only prevent starting if it's not already live and the time has expired
    if (session.status !== 'live' && Date.now() > scheduledEnd + gracePeriodMs) {
      return NextResponse.json({ success: false, message: 'This session has already ended.' }, { status: 400 });
    }

    const { hostUrl, forceStart } = await req.json();

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

    if (!hostUrl || typeof hostUrl !== 'string') {
        return NextResponse.json({ error: 'Valid hostUrl is required' }, { status: 400 });
    }
    
    // Add simple URL validation
    try {
      new URL(hostUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Update the host_url, join_url, and set status to live
    await pool.query(`
      UPDATE live_sessions 
      SET host_url = $1, join_url = $1, status = 'live', updated_at = NOW() 
      WHERE id = $2
    `, [hostUrl, sessionId]);

    // Dispatch LIVE notifications to students
    const registrantsRes = await pool.query(`
      SELECT u.id as user_id, u.email, u.first_name
      FROM session_registrations sr
      JOIN enrolments e ON sr.enrolment_id = e.id
      JOIN users u ON e.user_id = u.id
      WHERE sr.session_id = $1
    `, [sessionId]);

    for (const reg of registrantsRes.rows) {
      await createNotification({
        userId: reg.user_id,
        title: 'Session LIVE! 🔴',
        message: `The live session "${session.title}" for your course "${session.course_name}" is now LIVE! Click here to join.`,
        type: 'warning',
        sendEmail: true,
        emailTo: reg.email,
        emailSubject: `LIVE NOW: ${session.title}`,
        emailHtml: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #EF4444;">Session is LIVE! 🔴</h2>
            <p>Hi ${reg.first_name},</p>
            <p>The live class <strong>${session.title}</strong> for the course <strong>${session.course_name}</strong> has started!</p>
            <a href="${req.nextUrl.origin}/dashboard" style="display: inline-block; background: #C74A4A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">Join Class Now</a>
          </div>
        `
      });
    }

    return NextResponse.json({ success: true, hostUrl }, { status: 200 });


  } catch (error) {
    console.error('Update Host URL API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
