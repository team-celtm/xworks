import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import pool from '@/lib/db';

const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET!
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

    const certCheck = await pool.query('SELECT id, status FROM certificates WHERE credential_id = $1', [credential_id]);
    if (certCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
    }
    const cert = certCheck.rows[0];

    await pool.query(
      `UPDATE certificates 
       SET status = 'revoked', revoked_at = NOW(), revoked_by = $1, revoke_reason = $2 
       WHERE credential_id = $3`,
      [admin.id, reason, credential_id]
    );

    // Log audit event
    const { logAdminAction } = await import('@/lib/audit');
    await logAdminAction(admin.id, 'certificate_revoke', 'certificate', cert.id, { status: cert.status }, { status: 'revoked', reason });

    return NextResponse.json({ success: true, message: 'Certificate revoked successfully.' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
