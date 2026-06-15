import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import pool from '@/lib/db';

const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET!
);

async function checkAdmin() {
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

export async function GET(req: Request) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    let page = parseInt(searchParams.get('page') || '1');
    if (isNaN(page) || page < 1) page = 1;
    const limit = 50;
    const offset = (page - 1) * limit;

    let whereClause = '';
    let params: any[] = [];
    if (search) {
      params.push(`%${search}%`);
      whereClause = `WHERE (a.action ILIKE $1 OR a.entity_type ILIKE $1 OR u.email ILIKE $1)`;
    }

    const query = `
      SELECT a.*, u.first_name, u.last_name, u.email as admin_email
      FROM audit_logs a
      LEFT JOIN users u ON u.id = a.admin_id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    const result = await pool.query(query, [...params, limit, offset]);

    const countRes = await pool.query(`SELECT COUNT(*) FROM audit_logs a LEFT JOIN users u ON u.id = a.admin_id ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count);

    return NextResponse.json({ 
      auditLogs: result.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err: any) {
    console.error('API Audit Logs Error:', err);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
