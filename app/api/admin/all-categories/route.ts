import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT c.id, c.name, c.parent_id, p.name as parent_name 
       FROM categories c
       LEFT JOIN categories p ON c.parent_id = p.id
       ORDER BY COALESCE(p.name, c.name), c.parent_id IS NOT NULL, c.name`
    );
    return NextResponse.json({ categories: result.rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
