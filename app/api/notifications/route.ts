import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { jwtVerify } from 'jose';

const SESSION_SECRET = process.env.SESSION_SECRET!;

export async function GET(req: NextRequest) {
  try {
    const accessToken = req.cookies.get('access_token')?.value;
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { payload } = await jwtVerify(accessToken, new TextEncoder().encode(SESSION_SECRET));
    const userId = (payload as any).id;
    const role = (payload as any).role;

    // Fetch notifications matching either user_id or role (e.g. admin)
    // Optimized with UNION ALL to prevent Postgres from doing a slow reverse index scan on created_at
    const sql = `
      SELECT id, title, message, type, is_read as "isRead", created_at as "createdAt"
      FROM (
        (SELECT id, title, message, type, is_read, created_at
         FROM notifications
         WHERE user_id = $1::uuid
         ORDER BY created_at DESC
         LIMIT 50)
        UNION ALL
        (SELECT id, title, message, type, is_read, created_at
         FROM notifications
         WHERE role = $2
         ORDER BY created_at DESC
         LIMIT 50)
      ) sub
      ORDER BY "createdAt" DESC
      LIMIT 50
    `;
    const { rows } = await pool.query(sql, [userId, role]);

    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Fetch Notifications API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const accessToken = req.cookies.get('access_token')?.value;
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { payload } = await jwtVerify(accessToken, new TextEncoder().encode(SESSION_SECRET));
    const userId = (payload as any).id;
    const role = (payload as any).role;

    const body = await req.json();
    const { id, markAll } = body;

    if (markAll) {
      await pool.query(
        `UPDATE notifications SET is_read = true WHERE user_id = $1::uuid OR role = $2`,
        [userId, role]
      );
      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    if (!id) return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });

    const res = await pool.query(
      `UPDATE notifications SET is_read = true WHERE id = $1::uuid AND (user_id = $2::uuid OR role = $3) RETURNING id`,
      [id, userId, role]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Notification not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark Notification Read API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
