import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import pool from '@/lib/db';
import DOMPurify from 'isomorphic-dompurify';
import { slugify } from '@/lib/utils';
import { logAdminAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET!
);

async function checkAdmin() {
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
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });


  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const categoryId = searchParams.get('categoryId') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 10;
    const offset = (page - 1) * limit;

    let where = ["courses.status != 'deleted'"];
    let params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(courses.name ILIKE $${params.length} OR u.first_name ILIKE $${params.length} OR u.last_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
    }
    if (categoryId) {
      params.push(categoryId);
      where.push(`courses.category_id = $${params.length}`);
    }
    if (status) {
      params.push(status);
      where.push(`courses.status = $${params.length}`);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const query = `
      SELECT 
        courses.id, courses.name, courses.slug, courses.price, courses.level, courses.dur, courses.emoji, courses.g, courses.tag, courses.tag_label, courses.status, courses.certificate_type, courses.created_at, courses.category_id, courses.instructor_id, courses.logo, courses.details, courses.what_you_will_learn,
        courses.description, courses.short_description, courses.learning_points, courses.requirements, courses.target_audience, courses.tags_array, courses.thumbnail, courses.preview_video, courses.difficulty, courses.language, courses.certificate_enabled, courses.estimated_completion,
        cat.name as category_name, 
        u.first_name, u.last_name, u.email,
        (SELECT COUNT(*) FROM certificates WHERE course_id = courses.id) as issued_count
      FROM courses
      LEFT JOIN categories cat ON cat.id = courses.category_id
      LEFT JOIN instructors i ON i.id = courses.instructor_id
      LEFT JOIN users u ON u.id = i.user_id
      ${whereClause}
      ORDER BY courses.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const result = await pool.query(query, params);

    const countQuery = `
      SELECT COUNT(*) 
      FROM courses 
      LEFT JOIN instructors i ON i.id = courses.instructor_id
      LEFT JOIN users u ON u.id = i.user_id
      ${whereClause}
    `;
    const countRes = await pool.query(countQuery, params);
    const total = parseInt(countRes.rows[0].count);

    return NextResponse.json({ 
      courses: result.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    const courseRes = await pool.query('SELECT status, name FROM courses WHERE id = $1', [id]);
    if (courseRes.rows.length === 0) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }
    const course = courseRes.rows[0];

    // SOFT DELETE: Change status to 'deleted' to preserve enrolment records
    await pool.query("UPDATE courses SET status = 'deleted' WHERE id = $1", [id]);
    
    // Log audit event
    await logAdminAction(admin.id, 'course_delete', 'course', id, { status: course.status }, { status: 'deleted' });

    return NextResponse.json({ success: true, message: 'Course soft-deleted successfully' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    let {
      id, name, slug, category_id, instructor_id, price,
      level, dur, emoji, g, tag, tag_label, certificate_type, logo, details, what_you_will_learn,
      description, short_description, learning_points, requirements, target_audience, tags_array, thumbnail, preview_video, difficulty, language, certificate_enabled, estimated_completion
    } = body;
    slug = slugify(slug || name);

    if (description) {
      description = DOMPurify.sanitize(description.toString().trim());
    }
    const safeJson = (val: any) => JSON.stringify(Array.isArray(val) ? val.map(i => i.toString().trim().substring(0,200)) : []);


    if (!id || !name || !slug || !category_id || !instructor_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    if (price !== undefined && price < 0) {
      return NextResponse.json({ error: 'Price cannot be negative' }, { status: 400 });
    }
    if (dur !== undefined && dur < 0) {
      return NextResponse.json({ error: 'Duration cannot be negative' }, { status: 400 });
    }

    if (slug || name) {
      const duplicateCheck = await pool.query(
        "SELECT id FROM courses WHERE (slug = $1 OR name = $2) AND id != $3",
        [slug, name?.trim(), id]
      );
      if (duplicateCheck.rows.length > 0) {
        return NextResponse.json({ error: 'A course with this name or slug already exists' }, { status: 400 });
      }
    }

    const courseRes = await pool.query('SELECT name, slug, price, level, dur, emoji, g, tag, tag_label, certificate_type, logo, details, what_you_will_learn FROM courses WHERE id = $1', [id]);
    if (courseRes.rows.length === 0) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }
    const oldCourse = courseRes.rows[0];

    const updateFields = [];
    const values = [id];
    let idx = 2;

    if (name !== undefined) { updateFields.push(`name = $${idx++}`); values.push(name); }
    if (slug !== undefined) { updateFields.push(`slug = $${idx++}`); values.push(slug); }
    if (category_id !== undefined) { updateFields.push(`category_id = $${idx++}`); values.push(category_id); }
    if (instructor_id !== undefined) { updateFields.push(`instructor_id = $${idx++}`); values.push(instructor_id); }
    if (price !== undefined) { updateFields.push(`price = $${idx++}`); values.push(price); }
    if (level !== undefined) { updateFields.push(`level = $${idx++}`); values.push(level); }
    if (dur !== undefined) { updateFields.push(`dur = $${idx++}`); values.push(dur); }
    if (emoji !== undefined) { updateFields.push(`emoji = $${idx++}`); values.push(emoji); }
    if (g !== undefined) { updateFields.push(`g = $${idx++}`); values.push(g); }
    if (tag !== undefined) { updateFields.push(`tag = $${idx++}`); values.push(tag); }
    if (tag_label !== undefined) { updateFields.push(`tag_label = $${idx++}`); values.push(tag_label); }
    if (certificate_type !== undefined) { updateFields.push(`certificate_type = $${idx++}`); values.push(certificate_type); }
    if (logo !== undefined) { updateFields.push(`logo = $${idx++}`); values.push(logo); }
    if (details !== undefined) { updateFields.push(`details = $${idx++}`); values.push(JSON.stringify(details)); }
    if (what_you_will_learn !== undefined) { updateFields.push(`what_you_will_learn = $${idx++}`); values.push(what_you_will_learn); }
    if (description !== undefined) { updateFields.push(`description = $${idx++}`); values.push(description); }
    if (short_description !== undefined) { updateFields.push(`short_description = $${idx++}`); values.push(short_description); }
    if (learning_points !== undefined) { updateFields.push(`learning_points = $${idx++}`); values.push(safeJson(learning_points)); }
    if (requirements !== undefined) { updateFields.push(`requirements = $${idx++}`); values.push(safeJson(requirements)); }
    if (target_audience !== undefined) { updateFields.push(`target_audience = $${idx++}`); values.push(safeJson(target_audience)); }
    if (tags_array !== undefined) { updateFields.push(`tags_array = $${idx++}`); values.push(safeJson(tags_array)); }
    if (thumbnail !== undefined) { updateFields.push(`thumbnail = $${idx++}`); values.push(thumbnail); }
    if (preview_video !== undefined) { updateFields.push(`preview_video = $${idx++}`); values.push(preview_video); }
    if (difficulty !== undefined) { updateFields.push(`difficulty = $${idx++}`); values.push(difficulty); }
    if (language !== undefined) { updateFields.push(`language = $${idx++}`); values.push(language); }
    if (certificate_enabled !== undefined) { updateFields.push(`certificate_enabled = $${idx++}`); values.push(certificate_enabled); }
    if (estimated_completion !== undefined) { updateFields.push(`estimated_completion = $${idx++}`); values.push(estimated_completion); }

    if (updateFields.length === 0) {
      return NextResponse.json({ message: 'No fields to update' }, { status: 200 });
    }

    const query = `UPDATE courses SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING id`;
    const updateRes = await pool.query(query, values);

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Log audit event
    await logAdminAction(admin.id, 'course_update', 'course', id, oldCourse, { name, slug, category_id, instructor_id, price });

    return NextResponse.json({ success: true, message: 'Course updated successfully' });
  } catch (err: any) {
    console.error(err);
    if (err.code === '23505') {
      return NextResponse.json({ error: 'Slug already exists. Please choose a different slug.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
