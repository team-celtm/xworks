import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { jwtVerify } from 'jose';

const SESSION_SECRET = process.env.SESSION_SECRET || 'your-default-secret-change-me';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const accessToken = req.cookies.get('access_token')?.value;
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { payload } = await jwtVerify(accessToken, new TextEncoder().encode(SESSION_SECRET));
    const userId = (payload as any).id;
    const enrolmentId = params.id;

    // Verify active enrolment
    const sql = `
      SELECT e.*, c.title, c.description, c.slug, c.format, c.duration_mins
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
    const content = {
      enrolmentId: course.id,
      courseId: course.course_id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      currentProgress: parseFloat(course.progress_pct),
      curriculum: [
        { id: '1', title: 'Chapter 1: Getting Started', duration: '15:00', completed: true },
        { id: '2', title: 'Chapter 2: Core Concepts', duration: '45:00', completed: false },
        { id: '3', title: 'Chapter 3: Building Projects', duration: '60:00', completed: false },
      ]
    };

    return NextResponse.json(content, { status: 200 });
  } catch (error) {
    console.error('Access API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
