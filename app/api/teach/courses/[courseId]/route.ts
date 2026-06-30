import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { jwtVerify } from 'jose';
import { slugify } from '@/lib/utils';

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
    
    let instructor = await pool.query('SELECT id FROM instructors WHERE user_id = $1', [userId]);
    
    if (instructor.rows.length === 0) {
      instructor = await pool.query('INSERT INTO instructors (user_id) VALUES ($1) RETURNING id', [userId]);
    }
    
    return instructor.rows[0].id;
  } catch (err) {
    return null;
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  try {
    const instructorId = await getInstructorId(req);
    if (!instructorId) {
      return NextResponse.json({ error: 'Unauthorized or not an instructor' }, { status: 401 });
    }

    const resolvedParams = await params;
    const courseId = resolvedParams.courseId;
    const body = await req.json();
    
    let { 
      name, category_id, level, dur, price, tag, tag_label, live, nearby, distance, emoji, g, slug,
      description, short_description, learning_points, requirements, target_audience, tags_array,
      thumbnail, preview_video, difficulty, language, certificate_enabled, estimated_completion
    } = body;
    
    if (name) slug = slugify(slug || name);

    // Backend Sanitization & Validation (New Fields)
    if (short_description !== undefined) {
      short_description = short_description?.toString().trim();
      if (short_description && short_description.length > 250) {
        return NextResponse.json({ error: 'Short description exceeds 250 characters' }, { status: 422 });
      }
    }
    if (description !== undefined) {
      try {
        const DOMPurify = (await import('isomorphic-dompurify')).default;
        description = DOMPurify.sanitize(description?.toString().trim() || '');
      } catch (e) {
        description = description?.toString().trim() || '';
      }
      if (description && description.length > 50000) {
        return NextResponse.json({ error: 'Description exceeds maximum allowed length of 50,000 characters' }, { status: 422 });
      }
    }
    
    if (learning_points !== undefined) {
      if (!Array.isArray(learning_points) || learning_points.length === 0) {
        return NextResponse.json({ error: 'Learning points must contain at least one item' }, { status: 422 });
      }
      if (learning_points.length > 20) {
        return NextResponse.json({ error: 'Too many learning points (maximum 20)' }, { status: 422 });
      }
      learning_points = learning_points.map(lp => lp.toString().trim().substring(0, 200));
    }
    
    if (requirements !== undefined) {
      if (!Array.isArray(requirements) || requirements.length === 0) {
        return NextResponse.json({ error: 'Requirements must contain at least one item' }, { status: 422 });
      }
      if (requirements.length > 20) {
        return NextResponse.json({ error: 'Too many requirements (maximum 20)' }, { status: 422 });
      }
      requirements = requirements.map(req => req.toString().trim().substring(0, 200));
    }
    
    if (target_audience !== undefined) {
      if (!Array.isArray(target_audience)) target_audience = [];
      if (target_audience.length > 20) {
        return NextResponse.json({ error: 'Too many target audience items (maximum 20)' }, { status: 422 });
      }
      target_audience = target_audience.map((t: any) => t.toString().trim().substring(0, 200));
    }

    if (tags_array !== undefined && Array.isArray(tags_array)) {
      if (tags_array.length > 20) {
         return NextResponse.json({ error: 'Too many tags (maximum 20)' }, { status: 422 });
      }
      tags_array = Array.from(new Set(tags_array.map((t: string) => t.trim().substring(0, 100)).filter((t: string) => t.length > 0)));
    }

    // Validation
    if (name !== undefined && name.trim().length === 0) {
      return NextResponse.json({ error: 'Course name cannot be empty' }, { status: 400 });
    }
    if (price !== undefined && price < 0) {
      return NextResponse.json({ error: 'Price cannot be negative' }, { status: 400 });
    }
    if (dur !== undefined && dur < 0) {
      return NextResponse.json({ error: 'Duration cannot be negative' }, { status: 400 });
    }

    // Check if course belongs to instructor and is editable
    const checkCourse = await pool.query('SELECT id, status FROM courses WHERE id = $1 AND instructor_id = $2', [courseId, instructorId]);
    if (checkCourse.rows.length === 0) {
        return NextResponse.json({ error: 'Course not found or unauthorized' }, { status: 404 });
    }
    
    const currentStatus = checkCourse.rows[0].status;
    if (currentStatus !== 'draft' && currentStatus !== 'rejected') {
        return NextResponse.json({ error: 'Course cannot be edited because it is currently published or under review. Please contact an admin.' }, { status: 403 });
    }

    if (slug || name) {
      const slugToCheck = slug || name?.trim(); // Assuming slug is generated from name if not provided directly in earlier logic
      // In earlier logic: if (name) slug = slugify(slug || name);
      // Wait, let's just check against the provided slug or name
      const duplicateCheck = await pool.query(
        "SELECT id FROM courses WHERE (slug = $1 OR name = $2) AND id != $3",
        [slug, name?.trim(), courseId]
      );
      if (duplicateCheck.rows.length > 0) {
        return NextResponse.json({ error: 'A course with this name or slug already exists' }, { status: 400 });
      }
    }

    const updateFields = [];
    const values = [courseId, instructorId];
    let idx = 3;

    if (name !== undefined) { updateFields.push(`name = $${idx++}`); values.push(name); }
    if (category_id !== undefined) { updateFields.push(`category_id = $${idx++}`); values.push(category_id); }
    if (level !== undefined) { updateFields.push(`level = $${idx++}`); values.push(level); }
    if (dur !== undefined) { updateFields.push(`dur = $${idx++}`); values.push(dur); }
    if (price !== undefined) { updateFields.push(`price = $${idx++}`); values.push(price); }
    if (tag !== undefined) { updateFields.push(`tag = $${idx++}`); values.push(tag); }
    if (tag_label !== undefined) { updateFields.push(`tag_label = $${idx++}`); values.push(tag_label); }
    if (live !== undefined) { updateFields.push(`live = $${idx++}`); values.push(live); }
    if (nearby !== undefined) { updateFields.push(`nearby = $${idx++}`); values.push(nearby); }
    if (distance !== undefined) { updateFields.push(`distance = $${idx++}`); values.push(distance); }
    if (emoji !== undefined) { updateFields.push(`emoji = $${idx++}`); values.push(emoji); }
    if (g !== undefined) { updateFields.push(`g = $${idx++}`); values.push(g); }
    if (slug !== undefined) { updateFields.push(`slug = $${idx++}`); values.push(slug); }
    
    if (description !== undefined) { updateFields.push(`description = $${idx++}`); values.push(description); }
    if (short_description !== undefined) { updateFields.push(`short_description = $${idx++}`); values.push(short_description); }
    if (learning_points !== undefined) { updateFields.push(`learning_points = $${idx++}`); values.push(JSON.stringify(learning_points)); }
    if (requirements !== undefined) { updateFields.push(`requirements = $${idx++}`); values.push(JSON.stringify(requirements)); }
    if (target_audience !== undefined) { updateFields.push(`target_audience = $${idx++}`); values.push(JSON.stringify(target_audience)); }
    if (tags_array !== undefined) { updateFields.push(`tags_array = $${idx++}`); values.push(JSON.stringify(tags_array)); }
    if (thumbnail !== undefined) { updateFields.push(`thumbnail = $${idx++}`); values.push(thumbnail); }
    if (preview_video !== undefined) { updateFields.push(`preview_video = $${idx++}`); values.push(preview_video); }
    if (difficulty !== undefined) { updateFields.push(`difficulty = $${idx++}`); values.push(difficulty); }
    if (language !== undefined) { updateFields.push(`language = $${idx++}`); values.push(language); }
    if (certificate_enabled !== undefined) { updateFields.push(`certificate_enabled = $${idx++}`); values.push(certificate_enabled); }
    if (estimated_completion !== undefined) { updateFields.push(`estimated_completion = $${idx++}`); values.push(estimated_completion); }

    if (updateFields.length === 0) {
        return NextResponse.json({ message: 'No fields to update' }, { status: 200 });
    }

    const query = `UPDATE courses SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND instructor_id = $2 RETURNING *`;
    
    const { rows } = await pool.query(query, values);
    return NextResponse.json(rows[0], { status: 200 });

  } catch (error: any) {
    console.error('API Error /teach/courses/[id] PATCH:', error);
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A course with this name/slug already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
