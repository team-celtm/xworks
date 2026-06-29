import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const resolvedParams = await params;
    const slug = resolvedParams.slug?.trim();

    const query = `
      SELECT 
        c.id, 
        c.name as "title", 
        c.level as "difficulty", 
        c.dur as "duration", 
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
        c.description,
        c.short_description as "shortDescription",
        c.learning_points as "learningPoints",
        c.requirements,
        c.target_audience as "targetAudience",
        c.tags_array as "tags",
        c.thumbnail,
        c.preview_video as "previewVideo",
        c.language,
        c.certificate_enabled as "certificateEnabled",
        c.estimated_completion as "estimatedCompletion",
        cat.name as "categoryName",
        cat.slug as "categorySlug",
        u.first_name || ' ' || u.last_name as instructor,
        u.avatar_url as "instructorAvatar",
        i.bio as "instructorBio",
        c.logo
      FROM courses c
      JOIN categories cat ON c.category_id = cat.id
      JOIN instructors i ON c.instructor_id = i.id
      JOIN users u ON i.user_id = u.id
      WHERE c.slug = $1 AND c.status != 'deleted' AND u.status != 'suspended'
    `;

    const { rows } = await pool.query(query, [slug]);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const course = rows[0];

    const safeParse = (val: any) => {
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch (e) { return []; }
      }
      return Array.isArray(val) ? val : [];
    };

    const payload = {
      ...course,
      price: parseFloat(course.price),
      duration: parseInt(course.duration),
      rating: parseFloat(course.rating),
      tag: course.tag ? course.tag.toLowerCase() : '',
      learningPoints: safeParse(course.learningPoints),
      requirements: safeParse(course.requirements),
      targetAudience: safeParse(course.targetAudience),
      tags: safeParse(course.tags),
      certificateEnabled: course.certificateEnabled || false
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error('API Error /courses/:slug:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
