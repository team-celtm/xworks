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
    const body = await req.json();
    const { id, action } = body;

    if (!id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const status = action === 'approve' ? 'published' : 'draft'; // Revert back to draft if rejected
    const updateRes = await pool.query(
      `UPDATE courses SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id`,
      [status, id]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: `Course ${status}` });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
export async function POST(req: Request) {
  const admin = await checkAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const {
      name, slug, category_id, instructor_id, price,
      level, dur, emoji, g, tag, tag_label, certificate_type
    } = body;

    if (!name || !slug || !category_id || !instructor_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO courses (
        name, slug, category_id, instructor_id, price, 
        level, dur, emoji, g, tag, tag_label, status, certificate_type, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'published', $12, NOW(), NOW()) 
      RETURNING id`,
      [
        name, slug, category_id, instructor_id, price || 0,
        level || 'Beginner', dur || 0, emoji || '🎓', g || 't-indigo',
        tag || null, tag_label || null, certificate_type || 'default'
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Course created successfully',
      courseId: result.rows[0].id
    });
  } catch (err: any) {
    console.error(err);
    if (err.code === '23505') {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
