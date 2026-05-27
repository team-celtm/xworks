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
        (u.first_name || ' ' || u.last_name) as instructor,
        c.created_at as "createdAt",
        c.logo
    `;

    const values: any[] = [];
    const where: string[] = [];
    
    if (query) {
      // 1. Process query for FTS tsquery (strip punctuation, keep words > 2 chars, join with | for OR logic)
      const words = query.replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2);
      const tsquery = words.join(' | ');

      // Keep raw query and wildcard query for trigram/ILIKE fallback
      values.push(query, `%${query}%`);
      const qIdx = values.length - 1;
      const likeIdx = values.length;

      if (tsquery) {
        values.push(tsquery);
        const tsIdx = values.length;

        select += `, 
          (
            ts_rank(
              setweight(to_tsvector('english', coalesce(c.name, '')), 'A') || 
              setweight(to_tsvector('english', coalesce(cat.name, '')), 'B') ||
              setweight(to_tsvector('english', coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), 'C'),
              to_tsquery('english', $${tsIdx})
            ) 
            + (similarity(c.name, $${qIdx}) * 0.5)
          ) as rank`;
        
        where.push(`(
          (
            setweight(to_tsvector('english', coalesce(c.name, '')), 'A') || 
            setweight(to_tsvector('english', coalesce(cat.name, '')), 'B') || 
            setweight(to_tsvector('english', coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), 'C')
          ) @@ to_tsquery('english', $${tsIdx})
          OR c.name % $${qIdx} 
          OR c.name ILIKE $${likeIdx}
          OR cat.name ILIKE $${likeIdx}
          OR (u.first_name || ' ' || u.last_name) ILIKE $${likeIdx}
        )`);
      } else {
        // Fallback if query was too short/no words left after filter
        select += `, similarity(c.name, $${qIdx}) as rank`;
        where.push(`(
          c.name % $${qIdx} 
          OR c.name ILIKE $${likeIdx} 
          OR cat.name ILIKE $${likeIdx}
          OR (u.first_name || ' ' || u.last_name) ILIKE $${likeIdx}
        )`);
      }
    }

    if (category) {
      values.push(category);
      // Support both parent group and exact category match
      where.push(`(cat.slug = $${values.length} OR cat.id IN (SELECT id FROM categories WHERE parent_id = (SELECT id FROM categories WHERE slug = $${values.length})))`);
    }

    if (sort === 'new') {
      // Do not restrict by tag = 'new' so that newly created courses are actually returned here
    }

    let orderBy = 'c.name ASC';
    if (query) orderBy = 'rank DESC, ' + orderBy;
    else if (sort === 'best') orderBy = 'c.rating DESC, ' + orderBy;
    else if (sort === 'new') orderBy = 'c.created_at DESC, ' + orderBy;

    let sql = `
      ${select}
      FROM courses c
      JOIN categories cat ON c.category_id = cat.id
      JOIN instructors i ON c.instructor_id = i.id
      JOIN users u ON i.user_id = u.id
      ${where.length > 0 ? 'WHERE ' + where.join(' AND ') + " AND c.status = 'published'" : "WHERE c.status = 'published'"}
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
      tagLabel: r.tagLabel || r.tag_label || '',
      tag: r.tag ? r.tag.toLowerCase() : ''
    }));

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error('API Error /courses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
