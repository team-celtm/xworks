import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const tables = ['users', 'courses', 'categories', 'enrolments', 'payments', 'live_sessions', 'session_registrations'];
    const results: any = {};

    for (const table of tables) {
      try {
        const { rows } = await pool.query(`SELECT * FROM ${table} LIMIT 5`);
        results[table] = rows;
      } catch (e) {
        results[table] = { error: 'Table not found or inaccessible' };
      }
    }

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('Inspect Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
