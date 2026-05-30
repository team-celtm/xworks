import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { jwtVerify } from 'jose';

const SESSION_SECRET = process.env.SESSION_SECRET || 'your-default-secret-change-me';

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const accessToken = req.cookies.get('access_token')?.value;
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { payload } = await jwtVerify(accessToken, new TextEncoder().encode(SESSION_SECRET));
    const userId = (payload as any).id;
    const { id: sessionId } = await context.params;

    const body = await req.json().catch(() => ({}));
    const deviceInfo = body.deviceInfo || req.headers.get('user-agent') || 'Unknown';
    const browserInfo = body.browserInfo || 'Unknown';

    // Verify student is enrolled in this session and session is active
    const regCheck = await pool.query(`
      SELECT sr.id, sr.attendance_status, ls.status as session_status
      FROM session_registrations sr
      JOIN enrolments e ON sr.enrolment_id = e.id
      JOIN live_sessions ls ON sr.session_id = ls.id
      WHERE sr.session_id = $1 AND e.user_id = $2
    `, [sessionId, userId]);

    if (regCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Not enrolled in this session' }, { status: 403 });
    }

    const sessionStatus = regCheck.rows[0].session_status;
    if (sessionStatus === 'completed' || sessionStatus === 'expired' || sessionStatus === 'cancelled') {
      return NextResponse.json({ error: 'Session is no longer active' }, { status: 403 });
    }

    // Insert attendance record if not exists for today (prevent duplicate joins from spamming)
    // Actually, just insert a new join record if the previous one has a leave_time, OR update the existing active one
    const activeJoin = await pool.query(`
      SELECT id FROM session_attendance 
      WHERE session_id = $1 AND user_id = $2 AND leave_time IS NULL
      ORDER BY join_time DESC LIMIT 1
    `, [sessionId, userId]);

    if (activeJoin.rows.length === 0) {
      await pool.query(`
        INSERT INTO session_attendance (session_id, user_id, device_info, browser_info, status)
        VALUES ($1, $2, $3, $4, 'joined')
      `, [sessionId, userId, deviceInfo, browserInfo]);
    }

    // Update registration status to 'joined_session' if it was just 'enrolled'
    if (regCheck.rows[0].attendance_status === 'enrolled') {
      await pool.query(`
        UPDATE session_registrations 
        SET attendance_status = 'joined_session', updated_at = NOW()
        WHERE id = $1
      `, [regCheck.rows[0].id]);
    }

    // Update session updated_at to trigger real-time sync for instructors
    await pool.query(`UPDATE live_sessions SET updated_at = NOW() WHERE id = $1`, [sessionId]);

    return NextResponse.json({ success: true, message: 'Join tracked successfully' }, { status: 200 });
  } catch (error) {
    console.error('Attendance API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
