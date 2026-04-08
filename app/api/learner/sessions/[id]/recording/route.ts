import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { jwtVerify } from 'jose';

const SESSION_SECRET = process.env.SESSION_SECRET || 'your-default-secret-change-me';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const accessToken = req.cookies.get('access_token')?.value;
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { payload } = await jwtVerify(accessToken, new TextEncoder().encode(SESSION_SECRET));
    const userId = (payload as any).id;
    const { id: sessionId } = await params;

    // Verify session belongs to the user and recording is available
    const sql = `
      SELECT ls.recording_url, ls.recording_available
      FROM session_registrations sr
      JOIN live_sessions ls ON sr.session_id = ls.id
      JOIN enrolments e ON sr.enrolment_id = e.id
      WHERE ls.id = $1 AND e.user_id = $2
    `;
    const { rows } = await pool.query(sql, [sessionId, userId]);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Session not found or forbidden' }, { status: 404 });
    }

    const session = rows[0];

    if (!session.recording_available || !session.recording_url) {
      return NextResponse.json({ error: 'Recording is not securely available yet' }, { status: 404 });
    }

    // Redirect to the recording/CDN URL
    return NextResponse.redirect(new URL(session.recording_url));
  } catch (error) {
    console.error('Session Recording API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
