import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { jwtVerify } from 'jose';

const SESSION_SECRET = process.env.SESSION_SECRET || 'your-default-secret-change-me';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const accessToken = req.cookies.get('access_token')?.value;
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { payload } = await jwtVerify(accessToken, new TextEncoder().encode(SESSION_SECRET));
    const userId = (payload as any).id;
    const { id: sessionId } = await params;

    // Verify user is enrolled in the course that this session belongs to
    // or has a direct registration for this session
    const sql = `
      SELECT ls.recording_url, ls.recording_available, ls.title
      FROM live_sessions ls
      LEFT JOIN enrolments e ON ls.course_id = e.course_id AND e.user_id = $2 AND e.status = 'active'
      LEFT JOIN session_registrations sr ON ls.id = sr.session_id AND sr.enrolment_id = e.id
      WHERE ls.id = $1 AND (e.id IS NOT NULL OR sr.id IS NOT NULL)
    `;
    const { rows } = await pool.query(sql, [sessionId, userId]);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Forbidden or session not found' }, { status: 403 });
    }

    const session = rows[0];
    if (!session.recording_available || !session.recording_url) {
      return NextResponse.json({ error: 'Recording not available yet' }, { status: 404 });
    }

    // Redirect to the recording URL
    return NextResponse.redirect(new URL(session.recording_url));
  } catch (error) {
    console.error('Recording Access Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
