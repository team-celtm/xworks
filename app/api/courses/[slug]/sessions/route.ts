import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const courseId = (await params).slug;

    if (!courseId || courseId === 'undefined') {
      return NextResponse.json({ error: 'Invalid course ID' }, { status: 400 });
    }

    const { rows } = await pool.query(
      `SELECT * FROM live_sessions 
       WHERE course_id = $1::uuid AND scheduled_start > NOW() 
       ORDER BY scheduled_start ASC`,
      [courseId]
    );

    return NextResponse.json(rows, { status: 200 });

  } catch (error) {
    console.error('Fetch Sessions Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
