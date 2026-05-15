import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import pool from '@/lib/db';

const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'your-default-secret-change-me'
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
    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get('id');
    const body = await req.json();
    const { id, action, ...fields } = body;
    
    const courseId = id || idParam;
    if (!courseId) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    if (action && ['approve', 'reject'].includes(action)) {
      const status = action === 'approve' ? 'published' : 'draft';
      await pool.query(
        `UPDATE courses SET status = $1, updated_at = NOW() WHERE id = $2`,
        [status, courseId]
      );
      return NextResponse.json({ success: true, message: `Course ${status}` });
    }

    const name = fields.name?.trim();
    const slug = fields.slug?.trim().toLowerCase();
    const { category_id, instructor_id, level, emoji, g, tag, tag_label } = fields;
    const price = Math.max(0, parseFloat(fields.price) || 0);
    const dur = Math.max(0, parseInt(fields.dur) || 0);

    if (!name || !slug) return NextResponse.json({ error: 'Name and Slug are required' }, { status: 400 });

    await pool.query(
      `UPDATE courses SET 
        name = $1, slug = $2, category_id = $3, instructor_id = $4, price = $5, 
        level = $6, dur = $7, emoji = $8, g = $9, tag = $10, tag_label = $11, 
        updated_at = NOW() 
      WHERE id = $12`,
      [name, slug, category_id, instructor_id, price, level || 'Beginner', dur, emoji || '🎓', g || 't-indigo', tag || null, tag_label || null, courseId]
    );

    return NextResponse.json({ success: true, message: 'Course updated successfully' });
  } catch (err: any) {
    console.error(err);
    if (err.code === '23505') return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const admin = await checkAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const name = body.name?.trim();
    const slug = body.slug?.trim().toLowerCase();
    const { category_id, instructor_id, level, emoji, g, tag, tag_label } = body;
    const price = Math.max(0, parseFloat(body.price) || 0);
    const dur = Math.max(0, parseInt(body.dur) || 0);

    if (!name || !slug || !category_id || !instructor_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO courses (
        name, slug, category_id, instructor_id, price, 
        level, dur, emoji, g, tag, tag_label, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'published', NOW(), NOW()) 
      RETURNING id`,
      [name, slug, category_id, instructor_id, price, level || 'Beginner', dur, emoji || '🎓', g || 't-indigo', tag || null, tag_label || null]
    );

    return NextResponse.json({ success: true, message: 'Course created successfully', courseId: result.rows[0].id });
  } catch (err: any) {
    console.error(err);
    if (err.code === '23505') return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

