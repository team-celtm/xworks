import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import pool from '@/lib/db';

const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET!
);

async function checkAdmin(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SESSION_SECRET);
    if ((payload as any).role !== 'admin') return null;
    return payload as any;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const admin = await checkAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await pool.query(
      `SELECT c.*, u.first_name, u.last_name, u.email 
       FROM courses c
       JOIN instructors i ON i.id = c.instructor_id
       JOIN users u ON u.id = i.user_id
       WHERE c.status = 'under_review'
       ORDER BY c.created_at ASC`
    );
    return NextResponse.json({ courses: result.rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const admin = await checkAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { id, action } = body;

    if (!id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const courseRes = await pool.query('SELECT status, name, instructor_id FROM courses WHERE id = $1', [id]);
    if (courseRes.rows.length === 0) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }
    const course = courseRes.rows[0];

    // Block self-approval
    const instRes = await pool.query('SELECT user_id FROM instructors WHERE id = $1', [course.instructor_id]);
    if (instRes.rows.length > 0 && admin.id === instRes.rows[0].user_id) {
      return NextResponse.json({ error: 'Self-approval of courses is not permitted' }, { status: 400 });
    }

    const status = action === 'approve' ? 'published' : 'rejected';
    await pool.query(
      `UPDATE courses SET status = $1, updated_at = NOW() WHERE id = $2`,
      [status, id]
    );

    // Log audit event
    const { logAdminAction } = await import('@/lib/audit');
    await logAdminAction(admin.id, `course_${action}`, 'course', id, { status: course.status }, { status });

    return NextResponse.json({ success: true, message: `Course ${status}` });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
import { slugify } from '@/lib/utils';
import DOMPurify from 'isomorphic-dompurify';

export async function POST(req: Request) {
  const admin = await checkAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    let {
      name, slug, category_id, instructor_id, price,
      level, dur, emoji, g, tag, tag_label, certificate_type, logo, details, what_you_will_learn,
      description, short_description, learning_points, requirements, target_audience, tags_array, thumbnail, preview_video, difficulty, language, certificate_enabled, estimated_completion
    } = body;
    slug = slugify(slug || name);

    if (description) {
      description = DOMPurify.sanitize(description.toString().trim());
    }
    const safeJson = (val: any) => JSON.stringify(Array.isArray(val) ? val.map(i => i.toString().trim().substring(0,200)) : []);


    if (!name || !slug || !category_id || !instructor_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check for duplicates
    const duplicateCheck = await pool.query(
      "SELECT id FROM courses WHERE slug = $1 OR name = $2",
      [slug, name.trim()]
    );
    if (duplicateCheck.rows.length > 0) {
      return NextResponse.json({ error: 'A course with this name or slug already exists' }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO courses (
        name, slug, category_id, instructor_id, price, 
        level, dur, emoji, g, tag, tag_label, status, certificate_type, logo, details, what_you_will_learn, description, short_description, learning_points, requirements, target_audience, tags_array, thumbnail, preview_video, difficulty, language, certificate_enabled, estimated_completion, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'published', $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, NOW(), NOW()) 
      RETURNING id`,
      [
        name, slug, category_id, instructor_id, price || 0,
        level || 'Beginner', dur || 0, emoji || '🎓', g || 't-indigo',
        tag || null, tag_label || null, certificate_type || 'default', logo || null, JSON.stringify(details || []), what_you_will_learn || null,
        description || null, short_description || null, safeJson(learning_points), safeJson(requirements), safeJson(target_audience), safeJson(tags_array), thumbnail || null, preview_video || null, difficulty || null, language || null, certificate_enabled || false, estimated_completion || null
      ]
    );

    const newCourseId = result.rows[0].id;
    // Log audit event
    const { logAdminAction } = await import('@/lib/audit');
    await logAdminAction(admin.id, 'course_create', 'course', newCourseId, null, { name, slug, status: 'published' });

    return NextResponse.json({
      success: true,
      message: 'Course created successfully',
      courseId: newCourseId
    });
  } catch (err: any) {
    console.error(err);
    if (err.code === '23505') {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
