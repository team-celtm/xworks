import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    // Fetch subjects (top-level categories)
    const { rows: subjects } = await pool.query(`
      SELECT id, slug, name as label, icon, description as desc, color, accent
      FROM categories
      WHERE parent_id IS NULL
      ORDER BY name ASC
    `);

    // Fetch all courses for these subjects
    // Actually, we needSections under each Subject. Sections are sub-categories.
    for (const subject of subjects) {
      const { rows: sections } = await pool.query(`
        SELECT id, slug, name as title
        FROM categories
        WHERE parent_id = $1
        ORDER BY name ASC
      `, [subject.id]);

      for (const section of sections) {
        const { rows: items } = await pool.query(`
          SELECT 
            c.id, c.name, c.emoji as icon, c.dur, c.level, c.tag, c.tag_label as "tagLabel"
          FROM courses c
          WHERE c.category_id = $1
          LIMIT 4
        `, [section.id]);

        section.items = items.map(it => ({
          ...it,
          meta: `${it.dur} hrs · ${it.level}`
        }));
      }

      subject.sections = sections;
      // Derived fields for SUBJECTS structure
      subject.count = 'Multiple workshops'; // Could be dynamic if needed
    }

    return NextResponse.json(subjects, { status: 200 });

  } catch (error) {
    console.error('API Error /api/subjects:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
