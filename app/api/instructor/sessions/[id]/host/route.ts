import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { jwtVerify } from 'jose';

const SESSION_SECRET = process.env.SESSION_SECRET || 'your-default-secret-change-me';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const accessToken = req.cookies.get('access_token')?.value;
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { payload } = await jwtVerify(accessToken, new TextEncoder().encode(SESSION_SECRET));
    const userId = (payload as any).id;
    const sessionId = params.id;

    // Verify ownership
    const ownershipRes = await pool.query(`
      SELECT ls.id 
      FROM live_sessions ls
      JOIN courses c ON ls.course_id = c.id
      JOIN instructors i ON c.instructor_id = i.id
      WHERE ls.id = $1 AND i.user_id = $2
    `, [sessionId, userId]);

    if (ownershipRes.rows.length === 0) {
      return NextResponse.json({ error: 'Not authorized or session not found' }, { status: 403 });
    }

    const { hostUrl } = await req.json();

    if (!hostUrl || typeof hostUrl !== 'string') {
        return NextResponse.json({ error: 'Valid hostUrl is required' }, { status: 400 });
    }

    // Update the host_url
    await pool.query('UPDATE live_sessions SET host_url = $1 WHERE id = $2', [hostUrl, sessionId]);

    return NextResponse.json({ success: true, hostUrl }, { status: 200 });

  } catch (error) {
    console.error('Update Host URL API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
