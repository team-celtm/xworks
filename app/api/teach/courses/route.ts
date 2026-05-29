import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { jwtVerify } from 'jose';

const SESSION_SECRET = process.env.SESSION_SECRET || 'your-default-secret-change-me';

async function getInstructorId(req: NextRequest) {
  const accessToken = req.cookies.get('access_token')?.value;
  if (!accessToken) return null;

  try {
    const { payload } = await jwtVerify(
      accessToken,
      new TextEncoder().encode(SESSION_SECRET)
    );
    const userId = payload.id;
    const checkUser = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
    if (checkUser.rows[0]?.role !== 'instructor') return null;
    
    // Find instructor details
    let instructor = await pool.query('SELECT id FROM instructors WHERE user_id = $1', [userId]);
    
    // Auto-create instructor record if user has role 'instructor' but no instructor table row just in case
    if (instructor.rows.length === 0) {
      instructor = await pool.query('INSERT INTO instructors (user_id) VALUES ($1) RETURNING id', [userId]);
    }
    
    return instructor.rows[0].id;
  } catch (err) {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const instructorId = await getInstructorId(req);
    if (!instructorId) {
      return NextResponse.json({ error: 'Unauthorized or not an instructor' }, { status: 401 });
    }

    const { rows } = await pool.query("SELECT * FROM courses WHERE instructor_id = $1 AND LOWER(status) != 'deleted' ORDER BY name ASC", [instructorId]);
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('API Error /teach/courses GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { slugify } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const instructorId = await getInstructorId(req);
    if (!instructorId) {
      return NextResponse.json({ error: 'Unauthorized or not an instructor' }, { status: 401 });
    }

    const body = await req.json();
    let { name, category_id, level, dur, price, tag, tag_label, live, nearby, distance, emoji, g, slug } = body;
    slug = slugify(slug || name);

    // Edge Cases Validation
    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Course name is required' }, { status: 400 });
    }
    if (!category_id) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 });
    }
    if (price < 0) {
      return NextResponse.json({ error: 'Price cannot be negative' }, { status: 400 });
    }
    if (dur < 0) {
      return NextResponse.json({ error: 'Duration cannot be negative' }, { status: 400 });
    }

    // Use a transaction since we just want to create it
    const { rows } = await pool.query(
      `INSERT INTO courses 
        (instructor_id, name, category_id, level, dur, price, tag, tag_label, live, nearby, distance, emoji, g, slug, status) 
       VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'draft') 
       RETURNING *`,
      [instructorId, name, category_id, level, dur, price, tag, tag_label, live, nearby, distance, emoji, g, slug]
    );

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error: any) {
    console.error('API Error /teach/courses POST:', error);
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A course with this name/slug already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const instructorId = await getInstructorId(req);
    if (!instructorId) {
      return NextResponse.json({ error: 'Unauthorized or not an instructor' }, { status: 401 });
    }

    const { id, action } = await req.json();

    if (!id || !['submit_review', 'unpublish'].includes(action)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    let query = '';
    
    if (action === 'submit_review') {
      // Only allow submitting if it's currently draft or rejected
      query = `UPDATE courses SET status = 'under_review' WHERE id = $1 AND instructor_id = $2 AND status IN ('draft', 'rejected') RETURNING id`;
    } else if (action === 'unpublish') {
      // Only allow unpublishing if it's currently published
      query = `UPDATE courses SET status = 'draft' WHERE id = $1 AND instructor_id = $2 AND status = 'published' RETURNING id`;
    }

    const { rows } = await pool.query(query, [id, instructorId]);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Course not found or invalid current status for this action' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Status updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('API Error /teach/courses PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
