import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { jwtVerify } from 'jose';

const SESSION_SECRET = process.env.SESSION_SECRET || 'your-default-secret-change-me';

export async function GET(req: NextRequest) {
  try {
    const accessToken = req.cookies.get('access_token')?.value;
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { payload } = await jwtVerify(accessToken, new TextEncoder().encode(SESSION_SECRET));
    const userId = (payload as any).id;

    const sql = `
      SELECT 
        ls.id as "sessionId",
        ls.title as "sessionTitle",
        ls.scheduled_start as "scheduledStart",
        ls.scheduled_end as "scheduledEnd",
        ls.status as "sessionStatus",
        ls.host_url as "hostUrl",
        ls.recording_available as "recordingAvailable",
        c.name as "courseName",
        COUNT(sr.id) as "registrantCount",
        (SELECT COUNT(DISTINCT user_id) FROM session_attendance sa WHERE sa.session_id = ls.id) as "attendedCount"
      FROM live_sessions ls
      JOIN courses c ON ls.course_id = c.id
      JOIN instructors i ON c.instructor_id = i.id
      LEFT JOIN session_registrations sr ON sr.session_id = ls.id
      WHERE i.user_id = $1
      GROUP BY ls.id, c.name, ls.host_url, ls.recording_available
      ORDER BY ls.scheduled_start DESC
    `;
    const { rows } = await pool.query(sql, [userId]);

    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Instructor Sessions API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const accessToken = req.cookies.get('access_token')?.value;
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { payload } = await jwtVerify(accessToken, new TextEncoder().encode(SESSION_SECRET));
    const userId = (payload as any).id;

    const body = await req.json();
    const { courseId, title, scheduledStart, scheduledEnd } = body;

    if (!courseId || !title || !scheduledStart || !scheduledEnd) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (title.trim().length === 0) {
      return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
    }

    if (title.length > 255) {
      return NextResponse.json({ error: 'Title is too long (maximum 255 characters)' }, { status: 400 });
    }

    const startDate = new Date(scheduledStart);
    const endDate = new Date(scheduledEnd);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    if (startDate < new Date()) {
      return NextResponse.json({ error: 'Cannot schedule a session in the past' }, { status: 400 });
    }

    const maxFutureDate = new Date();
    maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 1);
    if (startDate > maxFutureDate) {
      return NextResponse.json({ error: 'Cannot schedule a session more than 1 year in advance' }, { status: 400 });
    }

    const durationMs = endDate.getTime() - startDate.getTime();
    const durationMinutes = durationMs / 60000;
    
    if (durationMinutes < 15) {
      return NextResponse.json({ error: 'Session duration must be at least 15 minutes' }, { status: 400 });
    }
    if (durationMinutes > 60 * 12) {
      return NextResponse.json({ error: 'Session duration cannot exceed 12 hours' }, { status: 400 });
    }

    // Verify course belongs to instructor, is live, and is not deleted
    const checkRes = await pool.query(`
      SELECT c.id, c.status, c.live
      FROM courses c 
      JOIN instructors i ON c.instructor_id = i.id 
      WHERE c.id = $1 AND i.user_id = $2
    `, [courseId, userId]);

    if (checkRes.rows.length === 0) {
      return NextResponse.json({ error: 'Course not found or unauthorized' }, { status: 403 });
    }

    if (checkRes.rows[0].status === 'deleted') {
      return NextResponse.json({ error: 'Cannot schedule sessions for deleted courses' }, { status: 400 });
    }

    // Check for overlapping sessions by this instructor
    const overlapRes = await pool.query(`
      SELECT ls.id 
      FROM live_sessions ls
      JOIN courses c ON ls.course_id = c.id
      JOIN instructors i ON c.instructor_id = i.id
      WHERE i.user_id = $1 
        AND ls.status IN ('scheduled', 'live')
        AND (
          (ls.scheduled_start <= $2 AND ls.scheduled_end > $2) OR
          (ls.scheduled_start < $3 AND ls.scheduled_end >= $3) OR
          (ls.scheduled_start >= $2 AND ls.scheduled_end <= $3)
        )
    `, [userId, startDate.toISOString(), endDate.toISOString()]);

    if (overlapRes.rows.length > 0) {
      return NextResponse.json({ error: 'You already have another session scheduled during this time.' }, { status: 400 });
    }

    const course = checkRes.rows[0];
    if (course.status === 'draft') {
      return NextResponse.json({ error: 'Cannot schedule sessions for draft courses' }, { status: 400 });
    }
    if (!course.live) {
      return NextResponse.json({ error: 'Cannot schedule a live session for a non-live course format' }, { status: 400 });
    }



    const insertSql = `
      INSERT INTO live_sessions (
        course_id, title, scheduled_start, scheduled_end, 
        status, timezone, recording_available, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, 
        'scheduled', 'Asia/Kolkata', false, NOW(), NOW()
      ) RETURNING id
    `;
    const newSession = await pool.query(insertSql, [courseId, title, scheduledStart, scheduledEnd]);

    return NextResponse.json({ success: true, sessionId: newSession.rows[0].id }, { status: 201 });
  } catch (error) {
    console.error('Instructor Sessions POST API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
