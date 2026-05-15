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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 10;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        courses.id, courses.name, courses.slug, courses.price, courses.level, courses.dur, courses.emoji, courses.g, courses.tag, courses.tag_label, courses.status, courses.created_at,
        cat.name as category_name, 
        u.first_name, u.last_name, u.email 
      FROM courses
      LEFT JOIN categories cat ON cat.id = courses.category_id
      LEFT JOIN instructors i ON i.id = courses.instructor_id
      LEFT JOIN users u ON u.id = i.user_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (courses.name ILIKE $${params.length} OR u.first_name ILIKE $${params.length} OR u.last_name ILIKE $${params.length})`;
    }

    if (categoryId) {
      params.push(categoryId);
      query += ` AND courses.category_id = $${params.length}`;
    }

    // Get total count for pagination
    const countRes = await pool.query(`SELECT COUNT(*) FROM (${query}) as sub`, params);
    const total = parseInt(countRes.rows[0].count);

    query += ` ORDER BY courses.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    
    const result = await pool.query(query, params);

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

    await pool.query('DELETE FROM courses WHERE id = $1', [id]);
    return NextResponse.json({ success: true, message: 'Course deleted' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
