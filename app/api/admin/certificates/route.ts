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

export async function PUT(req: Request) {
  const admin = await checkAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { credential_id, reason } = body;

    if (!credential_id || !reason) {
      return NextResponse.json({ error: 'Missing credential_id or reason' }, { status: 400 });
    }

    const updateRes = await pool.query(
      `UPDATE certificates 
       SET status = 'revoked', revoked_at = NOW(), revoked_by = $1, revoke_reason = $2 
       WHERE credential_id = $3 RETURNING id`,
      [admin.id, reason, credential_id]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Certificate revoked successfully.' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
