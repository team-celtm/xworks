import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { jwtVerify } from 'jose';

const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'your-default-secret-change-me'
);

async function checkInstructorOrAdmin(req: NextRequest) {
  const accessToken = req.cookies.get('access_token')?.value;
  if (!accessToken) return null;
  try {
    const { payload } = await jwtVerify(accessToken, SESSION_SECRET);
    return payload as any;
  } catch {
    return null;
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await checkInstructorOrAdmin(req);
  if (!user || !['instructor', 'admin'].includes(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id: sessionId } = await params;
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session ID' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify session exists and get details
      const checkSql = `
        SELECT ls.id, ls.status, ls.title, ls.course_id, c.instructor_id
        FROM live_sessions ls
        JOIN courses c ON ls.course_id = c.id
        WHERE ls.id = $1
      `;
      const checkRes = await client.query(checkSql, [sessionId]);
      if (checkRes.rows.length === 0) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      const session = checkRes.rows[0];

      // If instructor, check ownership
      if (user.role === 'instructor') {
        const instRes = await client.query('SELECT id FROM instructors WHERE user_id = $1', [user.id]);
        if (instRes.rows.length === 0 || instRes.rows[0].id !== session.instructor_id) {
          return NextResponse.json({ error: 'Forbidden: You do not own the course of this session' }, { status: 403 });
        }
      }

      // Enforce: Cannot delete live sessions
      if (session.status === 'live') {
        return NextResponse.json({ error: 'Cannot delete a live session' }, { status: 400 });
      }

      // Perform deletion
      await client.query('DELETE FROM live_sessions WHERE id = $1', [sessionId]);

      // Log audit event
      const { logAdminAction } = await import('@/lib/audit');
      await logAdminAction(user.id, 'session_delete', 'live_session', sessionId, { title: session.title, status: session.status }, null);

      await client.query('COMMIT');
      return NextResponse.json({ success: true, message: 'Session deleted successfully' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('Session DELETE API Error:', err);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
