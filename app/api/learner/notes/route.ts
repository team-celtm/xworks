import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthId } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { rows: notes } = await pool.query(`
      SELECT n.*, c.name as "workshopName" 
      FROM notes n
      LEFT JOIN courses c ON n.workshop_id = c.id
      WHERE n.user_id = $1
      ORDER BY n.is_pinned DESC, n.updated_at DESC
    `, [userId]);

    return NextResponse.json(notes);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthId(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { id, workshopId, title, content, tags, is_pinned } = body;

    if (id) {
      // Update
      const { rows } = await pool.query(`
        UPDATE notes 
        SET title = $1, content = $2, tags = $3, is_pinned = $4, workshop_id = $5, updated_at = NOW()
        WHERE id = $6 AND user_id = $7
        RETURNING *
      `, [title, content, tags, is_pinned, workshopId, id, userId]);
      return NextResponse.json(rows[0]);
    } else {
      // Create
      const { rows } = await pool.query(`
        INSERT INTO notes (user_id, workshop_id, title, content, tags, is_pinned)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [userId, workshopId, title, content, tags, is_pinned]);
      return NextResponse.json(rows[0]);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
