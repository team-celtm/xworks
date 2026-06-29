import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { jwtVerify } from 'jose';

const SESSION_SECRET = process.env.SESSION_SECRET!;

export async function GET(req: NextRequest) {
  try {
    const accessToken = req.cookies.get('access_token')?.value;
    if (!accessToken) return NextResponse.json([], { status: 200 }); // Fail silently for unauthed

    const { payload } = await jwtVerify(accessToken, new TextEncoder().encode(SESSION_SECRET));
    const userId = (payload as any).id;
    
    // Default to 5 seconds ago if not provided
    const defaultSync = new Date(Date.now() - 5000).toISOString();
    const lastSync = req.nextUrl.searchParams.get('last_sync') || defaultSync;
    
    if (req.signal.aborted) {
      return NextResponse.json([], { status: 499 });
    }

    // FETCH DELTA UPDATES
    // We fetch any session that has been updated since last_sync and belongs to the user 
    // (either they are the instructor OR they are registered as a learner)
    const sql = `
      SELECT DISTINCT ls.id, ls.status, ls.host_url, ls.join_url, ls.recording_available
      FROM live_sessions ls
      LEFT JOIN session_registrations sr ON sr.session_id = ls.id
      LEFT JOIN enrolments e ON sr.enrolment_id = e.id AND e.user_id = $1
      LEFT JOIN courses c ON ls.course_id = c.id
      LEFT JOIN instructors i ON c.instructor_id = i.id AND i.user_id = $1
      WHERE ls.updated_at >= $2::timestamp
      AND (e.user_id = $1 OR i.user_id = $1)
    `;
    
    const { rows } = await pool.query(sql, [userId, lastSync]);

    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Events Sync API Error:', error);
    // Don't throw 500s constantly if polling fails, just return empty array
    return NextResponse.json([], { status: 200 });
  }
}
