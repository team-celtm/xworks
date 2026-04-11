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

export async function GET(req: Request) {
  const admin = await checkAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await pool.query(
      `SELECT ia.*, u.first_name, u.last_name, u.email 
       FROM instructor_applications ia
       JOIN users u ON u.id = ia.user_id
       WHERE ia.status = 'pending'
       ORDER BY ia.created_at ASC`
    );
    return NextResponse.json({ applications: result.rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const admin = await checkAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { id, action } = body;

    if (!id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const status = action === 'approve' ? 'approved' : 'rejected';
      const updateRes = await client.query(
        `UPDATE instructor_applications SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING user_id, bio`,
        [status, id]
      );

      if (updateRes.rows.length === 0) {
        throw new Error('Application not found');
      }

      if (action === 'approve') {
        const { user_id, bio } = updateRes.rows[0];
        
        // Check if instructor exists
        const checkInst = await client.query('SELECT id FROM instructors WHERE user_id = $1', [user_id]);
        if (checkInst.rows.length === 0) {
          await client.query(
            `INSERT INTO instructors (user_id, bio) VALUES ($1, $2)`,
            [user_id, bio]
          );
        }

        // Update user role
        await client.query(`UPDATE users SET role = 'instructor' WHERE id = $1`, [user_id]);
      }

      await client.query('COMMIT');
      return NextResponse.json({ success: true, message: `Application ${status}` });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
