import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { jwtVerify } from 'jose';

const SESSION_SECRET = process.env.SESSION_SECRET || 'your-default-secret-change-me';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const accessToken = req.cookies.get('access_token')?.value;
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { payload } = await jwtVerify(accessToken, new TextEncoder().encode(SESSION_SECRET));
    const userId = (payload as any).id;
    const { id: credentialId } = await params;

    const sql = `
      SELECT pdf_url
      FROM certificates
      WHERE credential_id = $1 AND user_id = $2 AND status = 'issued'
    `;
    const { rows } = await pool.query(sql, [credentialId, userId]);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Certificate not found or not issued' }, { status: 404 });
    }

    const pdfUrl = rows[0].pdf_url;
    if (!pdfUrl) {
      return NextResponse.json({ error: 'Certificate PDF not generated yet' }, { status: 404 });
    }

    // Since this represents R2, we redirect to the secure/signed URL.
    // In our mock, it redirects to the generated `cdn.xworks.com` URL.
    return NextResponse.redirect(new URL(pdfUrl, req.url));
  } catch (error) {
    console.error('Download Certificate API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
