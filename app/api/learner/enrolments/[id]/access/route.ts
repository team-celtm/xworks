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
    const { id: enrolmentId } = await params;

    // Verify active enrolment
    const sql = `
      SELECT e.*, c.name, c.slug, c.dur
      FROM enrolments e
      JOIN courses c ON e.course_id = c.id
      WHERE e.id = $1 AND e.user_id = $2 AND e.status = 'active'
      AND (e.access_expires_at IS NULL OR e.access_expires_at > NOW())
    `;
    const { rows } = await pool.query(sql, [enrolmentId, userId]);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No active enrolment found' }, { status: 403 });
    }

    // Update last_accessed_at
    await pool.query('UPDATE enrolments SET last_accessed_at = NOW() WHERE id = $1', [enrolmentId]);

    const course = rows[0];

    // Fetch live sessions for this course
    const sessionsSql = `
      SELECT id, title, scheduled_start, recording_available, status
      FROM live_sessions
      WHERE course_id = $1
      ORDER BY scheduled_start ASC
    `;
    const { rows: sessions } = await pool.query(sessionsSql, [course.course_id]);

    const content = {
      enrolmentId: course.id,
      courseId: course.course_id,
      title: course.name,
      slug: course.slug,
      description: `Course content for ${course.name}`,
      currentProgress: parseFloat(course.progress_pct),
      curriculum: [
        { id: '1', title: 'Chapter 1: Getting Started', duration: '15:00', completed: parseFloat(course.progress_pct) >= 33 },
        { id: '2', title: 'Chapter 2: Core Concepts', duration: '45:00', completed: parseFloat(course.progress_pct) >= 66 },
        { id: '3', title: 'Chapter 3: Building Projects', duration: '60:00', completed: parseFloat(course.progress_pct) >= 100 },
      ],
      sessions: sessions.map(s => ({
        id: s.id,
        title: s.title,
        startTime: s.scheduled_start,
        recordingAvailable: s.recordingAvailable ?? s.recording_available,
        status: s.status
      }))
    };

    return NextResponse.json(content, { status: 200 });
  } catch (error) {
    console.error('Access API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
