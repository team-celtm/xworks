import { NextRequest, NextResponse } from 'next/server';
import DOMPurify from 'isomorphic-dompurify';
import pool from '@/lib/db';
import { jwtVerify } from 'jose';

const SESSION_SECRET = process.env.SESSION_SECRET!;

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
    let { 
      name, category_id, level, dur, price, tag, tag_label, live, nearby, distance, emoji, g, slug,
      description, short_description, learning_points, requirements, target_audience, tags_array,
      thumbnail, preview_video, difficulty, language, certificate_enabled, estimated_completion
    } = body;
    slug = slugify(slug || name);

    // Backend Sanitization & Validation (New Fields)
    short_description = short_description?.toString().trim();
    if (short_description && short_description.length > 250) {
      return NextResponse.json({ error: 'Short description exceeds 250 characters' }, { status: 422 });
    }
    
    description = DOMPurify.sanitize(description?.toString().trim() || '');
    if (description && description.length > 50000) {
      return NextResponse.json({ error: 'Description exceeds maximum allowed length of 50,000 characters' }, { status: 422 });
    }
    
    if (!Array.isArray(learning_points) || learning_points.length === 0) {
      return NextResponse.json({ error: 'Learning points must contain at least one item' }, { status: 422 });
    }
    if (learning_points.length > 20) {
      return NextResponse.json({ error: 'Too many learning points (maximum 20)' }, { status: 422 });
    }
    learning_points = learning_points.map(lp => lp.toString().trim().substring(0, 200));

    if (!Array.isArray(requirements) || requirements.length === 0) {
      return NextResponse.json({ error: 'Requirements must contain at least one item' }, { status: 422 });
    }
    if (requirements.length > 20) {
      return NextResponse.json({ error: 'Too many requirements (maximum 20)' }, { status: 422 });
    }
    requirements = requirements.map(req => req.toString().trim().substring(0, 200));

    if (target_audience) {
      if (!Array.isArray(target_audience)) target_audience = [];
      if (target_audience.length > 20) {
        return NextResponse.json({ error: 'Too many target audience items (maximum 20)' }, { status: 422 });
      }
      target_audience = target_audience.map(t => t.toString().trim().substring(0, 200));
    }

    if (tags_array && Array.isArray(tags_array)) {
      if (tags_array.length > 20) {
         return NextResponse.json({ error: 'Too many tags (maximum 20)' }, { status: 422 });
      }
      tags_array = Array.from(new Set(tags_array.map((t: string) => t.trim().substring(0, 100)).filter((t: string) => t.length > 0)));
    }

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

    // Check for duplicates
    const duplicateCheck = await pool.query(
      "SELECT id FROM courses WHERE slug = $1 OR name = $2",
      [slug, name.trim()]
    );
    if (duplicateCheck.rows.length > 0) {
      return NextResponse.json({ error: 'A course with this name or slug already exists' }, { status: 400 });
    }

    // Use a transaction since we just want to create it
    const { rows } = await pool.query(
      `INSERT INTO courses 
        (instructor_id, name, category_id, level, dur, price, tag, tag_label, live, nearby, distance, emoji, g, slug, status,
         description, short_description, learning_points, requirements, target_audience, tags_array,
         thumbnail, preview_video, difficulty, language, certificate_enabled, estimated_completion) 
       VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'draft',
         $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26) 
       RETURNING *`,
      [instructorId, name, category_id, level, dur, price, tag, tag_label, live, nearby, distance, emoji, g, slug,
       description || null, short_description || null, 
       learning_points ? JSON.stringify(learning_points) : '[]', 
       requirements ? JSON.stringify(requirements) : '[]', 
       target_audience ? JSON.stringify(target_audience) : '[]', 
       tags_array ? JSON.stringify(tags_array) : '[]', 
       thumbnail || null, preview_video || null, difficulty || null, language || null, 
       certificate_enabled || false, estimated_completion || null]
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
