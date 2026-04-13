import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const cats = await pool.query('SELECT id, name, slug FROM categories');
    const inst = await pool.query('SELECT i.id, u.first_name, u.last_name FROM instructors i JOIN users u ON i.user_id = u.id');
    return NextResponse.json({ categories: cats.rows, instructors: inst.rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
