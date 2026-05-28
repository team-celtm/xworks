import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { jwtVerify } from 'jose';

const SESSION_SECRET = process.env.SESSION_SECRET || 'your-default-secret-change-me';

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

    // Edge Case: Cancelled session
    if (session.status === 'cancelled') {
      return new NextResponse('This session has been cancelled.', { status: 403 });
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
    if (currentTime > scheduledEnd + gracePeriodMs) {
      return new NextResponse('This session has already ended.', { status: 403 });
    }

    const registrationId = session.sr_id;
    const joinUrl = session.join_url || session.host_url;

    // Mark joined_at if not set
    await pool.query(`
      UPDATE session_registrations 
      SET joined_at = COALESCE(joined_at, NOW())
      WHERE id = $1
    `, [registrationId]);

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
