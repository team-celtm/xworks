import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { jwtVerify } from 'jose';

const SESSION_SECRET = process.env.SESSION_SECRET || 'your-default-secret-change-me';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const regId = (await params).id;
    const { newSessionId } = await req.json();
    const accessToken = req.cookies.get('access_token')?.value;

    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { payload } = await jwtVerify(accessToken, new TextEncoder().encode(SESSION_SECRET));
    const userId = (payload as any).id;

    // 1. Get current registration details
    const regRes = await pool.query(`
      SELECT sr.*, e.user_id 
      FROM session_registrations sr
      JOIN enrolments e ON sr.enrolment_id = e.id
      WHERE sr.id = $1::uuid
    `, [regId]);

    if (regRes.rows.length === 0) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    const currentReg = regRes.rows[0];

    // Security check: ensure the registration belongs to the user
    if (currentReg.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (currentReg.session_id === newSessionId) {
       return NextResponse.json({ error: 'Already registered for this session' }, { status: 400 });
    }

    // 2. Transaction to update seats and session
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Decrement old session
      await client.query('UPDATE live_sessions SET registered_count = registered_count - 1 WHERE id = $1::uuid', [currentReg.session_id]);

      // Update registration to new session
      await client.query('UPDATE session_registrations SET session_id = $1::uuid, registered_at = NOW() WHERE id = $2::uuid', [newSessionId, regId]);

      // Increment new session
      await client.query('UPDATE live_sessions SET registered_count = registered_count + 1 WHERE id = $1::uuid', [newSessionId]);

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    return NextResponse.json({ success: true, message: 'Session rescheduled successfully' });

  } catch (error: any) {
    console.error('Reschedule API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
