import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { jwtVerify } from 'jose';

const SESSION_SECRET = process.env.SESSION_SECRET || 'your-default-secret-change-me';

async function getInstructorId(req: NextRequest) {
  const accessToken = req.cookies.get('access_token')?.value;
  if (!accessToken) return null;

  try {
    const { payload } = await jwtVerify(accessToken, new TextEncoder().encode(SESSION_SECRET));
    const userId = payload.id;
    const instructor = await pool.query('SELECT id FROM instructors WHERE user_id = $1', [userId]);
    return instructor.rows[0]?.id || null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const instructorId = await getInstructorId(req);
    if (!instructorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { rows } = await pool.query(`
      SELECT ls.*, c.name as course_name 
      FROM live_sessions ls 
      JOIN courses c ON ls.course_id = c.id 
      WHERE c.instructor_id = $1 
      ORDER BY ls.scheduled_start ASC
    `, [instructorId]);

    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('API Error /teach/sessions GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const instructorId = await getInstructorId(req);
    if (!instructorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { course_id, title, scheduled_start, scheduled_end, platform, join_url } = await req.json();

    const checkCourse = await pool.query('SELECT id FROM courses WHERE id = $1 AND instructor_id = $2', [course_id, instructorId]);
    if (checkCourse.rows.length === 0) {
      return NextResponse.json({ error: 'Forbidden or Course Not Found' }, { status: 403 });
    }

    const { rows } = await pool.query(
      `INSERT INTO live_sessions 
        (course_id, title, status, scheduled_start, scheduled_end, platform, join_url) 
       VALUES 
        ($1, $2, 'scheduled', $3, $4, $5, $6) 
       RETURNING *`,
      [course_id, title, scheduled_start, scheduled_end, platform, join_url]
    );

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('API Error /teach/sessions POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
