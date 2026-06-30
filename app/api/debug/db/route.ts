import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await pool.query("SELECT COUNT(*) FROM courses");
    const adminQuery = await pool.query("SELECT COUNT(*) FROM users WHERE role='admin'");
    
    // Also let's try the exact query that is failing just to see the error message
    let queryError = null;
    let queryRows = 0;
    try {
      const q = `SELECT 
        courses.id, courses.name, courses.slug, courses.price, courses.level, courses.dur, courses.emoji, courses.g, courses.tag, courses.tag_label, courses.status, courses.certificate_type, courses.created_at, courses.category_id, courses.instructor_id, courses.logo, courses.details, courses.what_you_will_learn,
        courses.description, courses.short_description, courses.learning_points, courses.requirements, courses.target_audience, courses.tags_array, courses.thumbnail, courses.preview_video, courses.difficulty, courses.language, courses.certificate_enabled, courses.estimated_completion,
        cat.name as category_name, 
        u.first_name, u.last_name, u.email
      FROM courses
      LEFT JOIN categories cat ON courses.category_id = cat.id
      LEFT JOIN instructors i ON courses.instructor_id = i.id
      LEFT JOIN users u ON i.user_id = u.id
      WHERE courses.status != 'deleted'
      ORDER BY courses.created_at DESC
      LIMIT 10 OFFSET 0`;
      const res2 = await pool.query(q);
      queryRows = res2.rowCount || 0;
    } catch (e: any) {
      queryError = e.message;
    }

    return NextResponse.json({ 
      course_count: res.rows[0].count,
      admin_count: adminQuery.rows[0].count,
      queryError: queryError,
      queryRows: queryRows,
      // mask the password
      db_url: process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':***@') : 'MISSING'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
