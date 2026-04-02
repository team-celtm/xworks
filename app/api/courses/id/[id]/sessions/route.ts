import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const courseId = resolvedParams.id;

    // Use a simple query to fetch sessions
    const query = `
      SELECT 
        id, 
        title, 
        status, 
        scheduled_start as "scheduledStart", 
        scheduled_end as "scheduledEnd", 
        timezone, 
        platform, 
        max_seats as "maxSeats", 
        registered_count as "registeredCount",
        join_url as "joinUrl"
      FROM live_sessions
      WHERE course_id = $1
      ORDER BY scheduled_start ASC
    `;

    const { rows } = await pool.query(query, [courseId]);

    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('API Error /courses/:id/sessions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
