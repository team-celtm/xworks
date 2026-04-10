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
      SELECT sr.id as sr_id, ls.join_url
      FROM session_registrations sr
      JOIN live_sessions ls ON sr.session_id = ls.id
      JOIN enrolments e ON sr.enrolment_id = e.id
      WHERE ls.id = $1 AND e.user_id = $2
    `;
    const { rows } = await pool.query(sql, [sessionId, userId]);

    if (rows.length === 0) {
      return new NextResponse('Unauthorized or Session Not Found', { status: 404 });
    }

    const registrationId = rows[0].sr_id;
    const joinUrl = rows[0].join_url;

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
