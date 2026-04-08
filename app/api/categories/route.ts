import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parentSlug = searchParams.get('parent');

    let query;
    let values: any[] = [];

    if (parentSlug) {
      // Fetch sub-categories of a specific parent with course counts
      query = `
        SELECT 
          c.id, c.slug, c.name, c.parent_id, c.icon, c.description, c.color, c.accent,
          (SELECT COUNT(*) FROM courses WHERE category_id = c.id) as course_count
        FROM categories c
        JOIN categories p ON c.parent_id = p.id
        WHERE p.slug = $1
        ORDER BY c.name ASC
      `;
      values.push(parentSlug);
    } else {
      // Fetch top-level categories with total course counts (including sub-categories)
      query = `
        SELECT 
          id, slug, name, parent_id, icon, description, color, accent,
          (
            SELECT COUNT(*) FROM courses 
            WHERE category_id = categories.id 
            OR category_id IN (SELECT id FROM categories WHERE parent_id = categories.id)
          ) as course_count
        FROM categories
        WHERE parent_id IS NULL
        ORDER BY name ASC
      `;
    }

    const { rows } = await pool.query(query, values);
    return NextResponse.json(rows, { status: 200 });

  } catch (error) {
    console.error('API Error /categories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
