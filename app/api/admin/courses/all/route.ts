import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import pool from '@/lib/db';

const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'your-default-secret-change-me'
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

    // SOFT DELETE: Change status to 'deleted' to preserve enrolment records
    const res = await pool.query("UPDATE courses SET status = 'deleted' WHERE id = $1 RETURNING id", [id]);
    
    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

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
    const {
      id, name, slug, category_id, instructor_id, price,
      level, dur, emoji, g, tag, tag_label, certificate_type, logo, details, what_you_will_learn
    } = body;

    if (!id || !name || !slug || !category_id || !instructor_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const updateRes = await pool.query(
      `UPDATE courses SET 
        name = $1, slug = $2, category_id = $3, instructor_id = $4, price = $5, 
        level = $6, dur = $7, emoji = $8, g = $9, tag = $10, tag_label = $11, certificate_type = $12, logo = $13, details = $14, what_you_will_learn = $15, updated_at = NOW()
      WHERE id = $16 RETURNING id`,
      [
        name, slug, category_id, instructor_id, price || 0,
        level || 'Beginner', dur || 0, emoji || '🎓', g || 't-indigo',
        tag || null, tag_label || null, certificate_type || 'default', logo || null, JSON.stringify(details || []), what_you_will_learn || null, id
      ]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Course updated successfully' });
  } catch (err: any) {
    console.error(err);
    if (err.code === '23505') {
      return NextResponse.json({ error: 'Slug already exists. Please choose a different slug.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
