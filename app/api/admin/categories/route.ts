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

import { slugify } from '@/lib/utils';
export async function GET(req: Request) {
  const admin = await checkAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const query = `
      SELECT 
        c.id, c.slug, c.name, c.parent_id, c.icon, c.description, c.color, c.accent,
        p.name AS parent_name,
        (SELECT COUNT(*) FROM courses WHERE category_id = c.id AND status != 'deleted') AS course_count
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      ORDER BY COALESCE(p.name, c.name), c.parent_id IS NOT NULL, c.name
    `;
    const { rows } = await pool.query(query);
    return NextResponse.json({ categories: rows });
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
    const { name, icon, description, color, accent } = body;
    let { slug, parent_id } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!slug || slug.trim() === '') {
      slug = slugify(name);
    } else {
      slug = slugify(slug);
    }

    // 1. Unique slug check
    const slugCheck = await pool.query('SELECT id FROM categories WHERE slug = $1', [slug]);
    if (slugCheck.rows.length > 0) {
      return NextResponse.json({ error: 'Category slug must be unique' }, { status: 400 });
    }

    // 2. Parent validation (if any)
    if (parent_id && parent_id.trim() !== '') {
      const parentCheck = await pool.query('SELECT parent_id FROM categories WHERE id = $1', [parent_id]);
      if (parentCheck.rows.length === 0) {
        return NextResponse.json({ error: 'Selected parent category does not exist' }, { status: 400 });
      }
      if (parentCheck.rows[0].parent_id !== null) {
        return NextResponse.json({ error: 'Multi-level nesting is not allowed. Parent category must be a top-level category.' }, { status: 400 });
      }
    } else {
      parent_id = null;
    }

    const insertQuery = `
      INSERT INTO categories (slug, name, parent_id, icon, description, color, accent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const result = await pool.query(insertQuery, [
      slug,
      name.trim(),
      parent_id,
      icon ? icon.trim() : null,
      description ? description.trim() : null,
      color ? color.trim() : null,
      accent ? accent.trim() : null
    ]);

    return NextResponse.json({ success: true, category: result.rows[0] });
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
    const { id, name, icon, description, color, accent } = body;
    let { slug, parent_id } = body;

    if (!id || !name) {
      return NextResponse.json({ error: 'ID and Name are required' }, { status: 400 });
    }

    if (!slug || slug.trim() === '') {
      slug = slugify(name);
    } else {
      slug = slugify(slug);
    }

    // Verify category exists
    const checkExist = await pool.query('SELECT id, parent_id FROM categories WHERE id = $1', [id]);
    if (checkExist.rows.length === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // 1. Unique slug check
    const slugCheck = await pool.query('SELECT id FROM categories WHERE slug = $1 AND id != $2', [slug, id]);
    if (slugCheck.rows.length > 0) {
      return NextResponse.json({ error: 'Category slug must be unique' }, { status: 400 });
    }

    // 2. Parent validation (if any)
    if (parent_id && parent_id.trim() !== '') {
      if (parent_id === id) {
        return NextResponse.json({ error: 'A category cannot be its own parent' }, { status: 400 });
      }

      const parentCheck = await pool.query('SELECT parent_id FROM categories WHERE id = $1', [parent_id]);
      if (parentCheck.rows.length === 0) {
        return NextResponse.json({ error: 'Selected parent category does not exist' }, { status: 400 });
      }
      if (parentCheck.rows[0].parent_id !== null) {
        return NextResponse.json({ error: 'Multi-level nesting is not allowed. Parent category must be a top-level category.' }, { status: 400 });
      }

      // If it is changing to a sub-category, verify it doesn't have child categories itself
      const childrenCheck = await pool.query('SELECT COUNT(*) FROM categories WHERE parent_id = $1', [id]);
      if (parseInt(childrenCheck.rows[0].count) > 0) {
        return NextResponse.json({ error: 'Cannot set a parent category as a sub-category when it already has sub-categories.' }, { status: 400 });
      }
    } else {
      parent_id = null;
    }

    const updateQuery = `
      UPDATE categories 
      SET slug = $1, name = $2, parent_id = $3, icon = $4, description = $5, color = $6, accent = $7 
      WHERE id = $8 
      RETURNING *
    `;
    const result = await pool.query(updateQuery, [
      slug,
      name.trim(),
      parent_id,
      icon ? icon.trim() : null,
      description ? description.trim() : null,
      color ? color.trim() : null,
      accent ? accent.trim() : null,
      id
    ]);

    return NextResponse.json({ success: true, category: result.rows[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const admin = await checkAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Verify category exists
    const checkExist = await pool.query('SELECT id FROM categories WHERE id = $1', [id]);
    if (checkExist.rows.length === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // 1. Check for child sub-categories
    const childCheck = await pool.query('SELECT name FROM categories WHERE parent_id = $1', [id]);
    if (childCheck.rows.length > 0) {
      const childNames = childCheck.rows.map(r => `- ${r.name}`).join('\n');
      console.log(`[AUDIT LOG] Category deletion blocked for ID ${id}. Reason: contains subcategories.`);
      return NextResponse.json({ 
        error: `Cannot delete category because it has subcategories:\n${childNames}` 
      }, { status: 400 });
    }

    // 2. Check for assigned courses (active, draft, review, published, archived - i.e. status != 'deleted')
    const courseCheck = await pool.query(
      `SELECT name, status FROM courses WHERE category_id = $1 AND status != 'deleted'`,
      [id]
    );

    if (courseCheck.rows.length > 0) {
      const courseNames = courseCheck.rows.map(r => `- ${r.name}`).join('\n');
      console.log(`[AUDIT LOG] Category deletion blocked for ID ${id}. Reason: has active courses.`);
      return NextResponse.json({ 
        error: `Cannot delete category. Used by:\n${courseNames}` 
      }, { status: 400 });
    }

    const catRes = await pool.query('SELECT name FROM categories WHERE id = $1', [id]);
    const catName = catRes.rows[0]?.name || 'Unknown';

    await pool.query('DELETE FROM categories WHERE id = $1', [id]);
    
    // Log audit event
    const { logAdminAction } = await import('@/lib/audit');
    await logAdminAction(admin.id, 'category_delete', 'category', id, { name: catName }, null);

    return NextResponse.json({ success: true, message: 'Category deleted successfully' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
