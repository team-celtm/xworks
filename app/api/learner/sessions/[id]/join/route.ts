import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { jwtVerify } from 'jose';

const SESSION_SECRET = process.env.SESSION_SECRET!;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const accessToken = req.cookies.get('access_token')?.value;
    if (!accessToken) {
      // If we attempt a redirect without auth, send them to login
      const loginUrl = new URL('/Login', req.url);
      loginUrl.searchParams.set('redirect', req.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    const { payload } = await jwtVerify(accessToken, new TextEncoder().encode(SESSION_SECRET));
    const userId = (payload as any).id;
    const { id: sessionId } = await params;

    // Validate registration and get join URL
    const sql = `
      SELECT sr.id as sr_id, ls.join_url, ls.host_url, ls.status, ls.scheduled_start, ls.scheduled_end
      FROM session_registrations sr
      JOIN live_sessions ls ON sr.session_id = ls.id
      JOIN enrolments e ON sr.enrolment_id = e.id
      WHERE ls.id = $1 AND e.user_id = $2
    `;
    const { rows } = await pool.query(sql, [sessionId, userId]);

    if (rows.length === 0) {
      return new NextResponse('Unauthorized or Session Not Found', { status: 404 });
    }

    const session = rows[0];

    // Edge Case: Cancelled or Ended session
    if (session.status === 'cancelled') {
      return new NextResponse('This session has been cancelled.', { status: 403 });
    }
    if (session.status === 'completed' || session.status === 'expired') {
      return new NextResponse('This session has already ended.', { status: 403 });
    }

    const currentTime = Date.now();
    const scheduledStart = new Date(session.scheduled_start).getTime();
    const scheduledEnd = session.scheduled_end ? new Date(session.scheduled_end).getTime() : scheduledStart + (60 * 60 * 1000);
    
    // Edge Case: Too early to join (allow 15 mins early access)
    const joinableTime = scheduledStart - (15 * 60 * 1000);
    if (currentTime < joinableTime) {
      return new NextResponse('It is too early to join this session. Please come back 15 minutes before the start time.', { status: 403 });
    }

    // Edge Case: Session ended
    const gracePeriodMs = parseInt(process.env.SESSION_GRACE_PERIOD_MINUTES || '10') * 60 * 1000;
    if (session.status !== 'live' && currentTime > scheduledEnd + gracePeriodMs) {
      return new NextResponse('This session has already ended.', { status: 403 });
    }

    const registrationId = session.sr_id;
    const joinUrl = session.join_url || session.host_url;

    // Mark joined_at and attendance_status
    await pool.query(`
      UPDATE session_registrations 
      SET joined_at = COALESCE(joined_at, NOW()),
          attendance_status = CASE WHEN attendance_status = 'enrolled' THEN 'joined_session' ELSE attendance_status END,
          updated_at = NOW()
      WHERE id = $1
    `, [registrationId]);

    // Parse Device Info
    const deviceInfo = req.headers.get('user-agent') || 'Unknown';

    // Reconnect / refresh merging logic:
    // If there is an active join, check how long it has been since join_time or if the device is different.
    // If it's been >= 2 minutes or the device is different, we close that active join and start a new one.
    // Otherwise (reconnect/refresh on same device within 2 mins), we keep the current one active.
    const activeJoin = await pool.query(`
      SELECT id, join_time, device_info FROM session_attendance 
      WHERE session_id = $1 AND user_id = $2 AND leave_time IS NULL
      ORDER BY join_time DESC LIMIT 1
    `, [sessionId, userId]);

    if (activeJoin.rows.length > 0) {
      const lastJoin = activeJoin.rows[0];
      const lastJoinTime = new Date(lastJoin.join_time).getTime();
      const elapsedSeconds = (Date.now() - lastJoinTime) / 1000;
      const isDifferentDevice = lastJoin.device_info !== deviceInfo;

      if (elapsedSeconds >= 120 || isDifferentDevice) {
        // Close the previous session join
        await pool.query(`
          UPDATE session_attendance
          SET leave_time = NOW(),
              duration_seconds = EXTRACT(EPOCH FROM (NOW() - join_time))
          WHERE id = $1
        `, [lastJoin.id]);

        // Insert new active join
        await pool.query(`
          INSERT INTO session_attendance (session_id, user_id, device_info, browser_info, status)
          VALUES ($1, $2, $3, 'ServerRedirect', 'joined')
        `, [sessionId, userId, deviceInfo]);
      }
      // If elapsedSeconds < 120 and same device, we merge (do nothing, keep activeJoin running)
    } else {
      // No active join, insert a new one
      await pool.query(`
        INSERT INTO session_attendance (session_id, user_id, device_info, browser_info, status)
        VALUES ($1, $2, $3, 'ServerRedirect', 'joined')
      `, [sessionId, userId, deviceInfo]);
    }

    // Trigger realtime sync
    await pool.query(`UPDATE live_sessions SET updated_at = NOW() WHERE id = $1`, [sessionId]);

    if (!joinUrl) {
      return new NextResponse('Join URL not configured for this session', { status: 400 });
    }

    // Redirect to the actual join URL (e.g., Zoom, Meet, Teams)
    return NextResponse.redirect(new URL(joinUrl));
  } catch (error) {
    console.error('Session Join API Error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
