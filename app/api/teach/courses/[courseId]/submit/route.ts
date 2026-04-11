import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { jwtVerify } from 'jose';

const SESSION_SECRET = process.env.SESSION_SECRET || 'your-default-secret-change-me';

export async function POST(req: NextRequest, { params }: { params: { courseId: string } }) {
  try {
    const accessToken = req.cookies.get('access_token')?.value;
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let payload: any;
    try {
      const { payload: jwtPayload } = await jwtVerify(accessToken, new TextEncoder().encode(SESSION_SECRET));
      payload = jwtPayload;
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const checkInstructor = await pool.query(
      'SELECT c.id FROM courses c JOIN instructors i ON c.instructor_id = i.id WHERE c.id = $1 AND i.user_id = $2',
      [params.courseId, payload.id]
    );

    if (checkInstructor.rows.length === 0) {
      return NextResponse.json({ error: 'Forbidden or Course Not Found' }, { status: 403 });
    }

    await pool.query('UPDATE courses SET status = $1 WHERE id = $2', ['under_review', params.courseId]);

    return NextResponse.json({ message: 'Course submitted for review' }, { status: 200 });
  } catch (error) {
    console.error('API Error /teach/courses/submit:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
