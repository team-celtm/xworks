import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { jwtVerify } from 'jose';

const SESSION_SECRET = process.env.SESSION_SECRET || 'your-default-secret-change-me';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const accessToken = req.cookies.get('access_token')?.value;
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { payload } = await jwtVerify(accessToken, new TextEncoder().encode(SESSION_SECRET));
    const userId = (payload as any).id;
    const { id: sessionId } = await params;
    const { recordingUrl, available } = await req.json();

    // Verify instructor owns the session via courses and instructors junction
    const checkSql = `
      SELECT ls.id 
      FROM live_sessions ls
      JOIN courses c ON ls.course_id = c.id
      JOIN instructors i ON c.instructor_id = i.id
      WHERE ls.id = $1 AND i.user_id = $2
    `;
    const { rows } = await pool.query(checkSql, [sessionId, userId]);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update recording info and optionally mark as completed
    const updateSql = `
      UPDATE live_sessions 
      SET 
        recording_url = COALESCE($1, recording_url),
        recording_available = $2,
        status = CASE WHEN $2 = true THEN 'completed' ELSE status END
      WHERE id = $3
      RETURNING id, recording_available as "recordingAvailable", status
    `;
    const { rows: updated } = await pool.query(updateSql, [recordingUrl, available, sessionId]);

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error) {
    console.error('Instructor Session Recording API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
