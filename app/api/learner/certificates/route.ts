import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { jwtVerify } from 'jose';

const SESSION_SECRET = process.env.SESSION_SECRET || 'your-default-secret-change-me';

export async function GET(req: NextRequest) {
  try {
    const accessToken = req.cookies.get('access_token')?.value;
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { payload } = await jwtVerify(accessToken, new TextEncoder().encode(SESSION_SECRET));
    const userId = (payload as any).id;

    const sql = `
      SELECT 
        ce.credential_id as "credentialId",
        ce.issued_at as "issuedAt",
        ce.pdf_url as "pdfUrl",
        ce.verification_url as "verificationUrl",
        co.name as "courseName",
        co.emoji,
        co.g as "thumbBg"
      FROM certificates ce
      JOIN courses co ON ce.course_id = co.id
      WHERE ce.user_id = $1 AND ce.status = 'issued'
      ORDER BY ce.issued_at DESC
    `;
    const { rows } = await pool.query(sql, [userId]);

    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Learner Certificates API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
