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

    // Verify ownership and check status
    const checkSql = `
      SELECT ls.id, ls.status, ls.scheduled_start, ls.host_url
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
    `;
    await pool.query(updateSql, [sessionId]);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Instructor End Session API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
