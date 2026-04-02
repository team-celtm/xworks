import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const resolvedParams = await params;
    const slug = resolvedParams.slug;

    const query = `
      SELECT 
        c.id, 
        c.name, 
        c.level, 
        c.dur, 
        c.price, 
        c.rating, 
        c.tag, 
        c.tag_label as "tagLabel", 
        c.live, 
        c.nearby, 
        c.distance, 
        c.emoji, 
        c.g,
        c.slug,
        cat.name as "categoryName",
        cat.slug as "categorySlug",
        u.first_name || ' ' || u.last_name as instructor,
        u.avatar_url as "instructorAvatar",
        i.bio as "instructorBio"
      FROM courses c
      JOIN categories cat ON c.category_id = cat.id
      JOIN instructors i ON c.instructor_id = i.id
      JOIN users u ON i.user_id = u.id
      WHERE c.slug = $1
    `;

    const { rows } = await pool.query(query, [slug]);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const course = rows[0];
    const payload = {
      ...course,
      price: parseFloat(course.price),
      dur: parseInt(course.dur),
      rating: parseFloat(course.rating)
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error('API Error /courses/:slug:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
