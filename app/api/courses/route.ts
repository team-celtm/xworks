import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const category = searchParams.get('category');

    const sort = searchParams.get('sort');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    let select = `
      SELECT 
        c.id, 
        c.slug,
        c.name, 
        c.level, 
        c.dur, 
        c.price, 
        c.rating, 
        c.tag, 
        c.tag_label as "tagLabel", 
        c.live, 
        c.nearby, 
        c.distance, 
        c.emoji, 
        c.g,
        cat.slug as "cat",
        cat.name as "catLabel",
        (u.first_name || ' ' || u.last_name) as instructor
    `;

    const values: any[] = [];
    const where: string[] = [];
    
    if (query) {
      values.push(query, `%${query}%`);
      select += `, similarity(c.name, $1) as rank`;
      where.push(`(c.name % $${values.length - 1} OR c.name ILIKE $${values.length})`);
    }

    if (category) {
      values.push(category);
      // Support both parent group and exact category match
      where.push(`(cat.slug = $${values.length} OR cat.id IN (SELECT id FROM categories WHERE parent_id = (SELECT id FROM categories WHERE slug = $${values.length})))`);
    }

    if (sort === 'new') {
      where.push("c.tag = 'new'");
    }

    let orderBy = 'c.name ASC';
    if (query) orderBy = 'rank DESC, ' + orderBy;
    else if (sort === 'best') orderBy = 'c.rating DESC, ' + orderBy;

    let sql = `
      ${select}
      FROM courses c
      JOIN categories cat ON c.category_id = cat.id
      JOIN instructors i ON c.instructor_id = i.id
      JOIN users u ON i.user_id = u.id
      ${where.length > 0 ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY ${orderBy}
      LIMIT ${limit}
    `;

    const { rows } = await pool.query(sql, values);
    
    // cast numbers due to node-postgres numeric/bigint parsing differences
    const payload = rows.map(r => ({
      ...r,
      price: r.price ? parseFloat(r.price) : 0,
      dur: r.dur ? parseInt(r.dur, 10) : 0,
      rating: r.rating ? parseFloat(r.rating) : 0,
      tagLabel: r.tagLabel || r.tag_label || ''
    }));

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error('API Error /courses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
