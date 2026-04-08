import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { jwtVerify } from 'jose';

const SESSION_SECRET = process.env.SESSION_SECRET || 'your-default-secret-change-me';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const accessToken = req.cookies.get('access_token')?.value;
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { payload } = await jwtVerify(accessToken, new TextEncoder().encode(SESSION_SECRET));
    const userId = (payload as any).id;
    const { id: enrolmentId } = await params;

    const { progressPct } = await req.json();

    if (typeof progressPct !== 'number' || progressPct < 0 || progressPct > 100) {
      return NextResponse.json({ error: 'Invalid progress percentage' }, { status: 400 });
    }

    // Update progress
    let updateSql = `
      UPDATE enrolments 
      SET progress_pct = $1, 
          last_accessed_at = NOW()
    `;
    const paramsList = [progressPct, enrolmentId, userId];

    if (progressPct === 100) {
      updateSql += `, status = 'completed', completed_at = NOW()`;
    }

    updateSql += ` WHERE id = $2 AND user_id = $3 RETURNING *`;

    const { rows } = await pool.query(updateSql, paramsList);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Enrolment not found' }, { status: 404 });
    }

    if (progressPct === 100) {
      // Trigger certificate job (fire and forget)
      const protocol = req.headers.get('x-forwarded-proto') || 'http';
      const host = req.headers.get('host') || 'localhost:3000';
      
      fetch(`${protocol}://${host}/api/certificates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId, 
          courseId: rows[0].course_id, 
          enrolmentId 
        })
      }).catch(err => console.error("Failed to trigger certificate job", err));
    }

    return NextResponse.json(rows[0], { status: 200 });
  } catch (error) {
    console.error('Progress API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
