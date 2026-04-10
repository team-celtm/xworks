import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ credential_id: string }> }) {
  try {
    const { credential_id: credentialId } = await params;

    if (!credentialId) {
      return NextResponse.json({ error: 'Missing credential ID' }, { status: 400 });
    }

    const sql = `
      SELECT 
        ce.credential_id as "credentialId",
        ce.status,
        ce.issued_at as "issuedAt",
        ce.pdf_url as "pdfUrl",
        u.first_name || ' ' || u.last_name as "learnerName",
        co.name as "courseName",
        co.dur as "courseDuration",
        co.emoji,
        co.g as "thumbBg"
      FROM certificates ce
      JOIN users u ON ce.user_id = u.id
      JOIN courses co ON ce.course_id = co.id
      WHERE ce.credential_id = $1
    `;

    const { rows } = await pool.query(sql, [credentialId]);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
    }

    return NextResponse.json(rows[0], { status: 200 });
  } catch (error) {
    console.error('Certificate verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
