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

    if (!id || !['approve', 'reject', 'suspend', 'reinstate'].includes(action)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // Support Suspend and Reinstate
    if (['suspend', 'reinstate'].includes(action)) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        const userRes = await client.query(`
          SELECT u.id, u.role, u.status 
          FROM users u 
          LEFT JOIN instructors i ON i.user_id = u.id
          WHERE u.id = $1::uuid OR i.id = $1::uuid
        `, [id]);
        
        if (userRes.rows.length === 0) {
          return NextResponse.json({ error: 'Instructor user not found' }, { status: 404 });
        }
        
        const targetUser = userRes.rows[0];
        
        if (targetUser.role !== 'instructor') {
          return NextResponse.json({ error: 'User is not an instructor' }, { status: 400 });
        }
        
        // Prevent Self-Suspension / Self-Reinstatement
        if (admin.id === targetUser.id) {
          return NextResponse.json({ error: 'Self-suspension or self-reinstatement is not permitted' }, { status: 400 });
        }
        
        const newStatus = action === 'suspend' ? 'suspended' : 'active';
        
        if (targetUser.status === newStatus) {
          return NextResponse.json({ error: `Instructor is already ${newStatus}` }, { status: 400 });
        }
        
        await client.query('UPDATE users SET status = $1 WHERE id = $2', [newStatus, targetUser.id]);
        
        // Log audit event
        const { logAdminAction } = await import('@/lib/audit');
        await logAdminAction(admin.id, `instructor_${action}`, 'user', targetUser.id, { status: targetUser.status }, { status: newStatus });
        
        await client.query('COMMIT');
        return NextResponse.json({ success: true, message: `Instructor successfully ${action}ed` });
      } catch (err: any) {
        await client.query('ROLLBACK');
        console.error(err);
        return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
      } finally {
        client.release();
      }
    }

    // Approve / Reject Application
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const appRes = await client.query(
        'SELECT user_id, bio, status FROM instructor_applications WHERE id = $1',
        [id]
      );
      if (appRes.rows.length === 0) {
        return NextResponse.json({ error: 'Application not found' }, { status: 404 });
      }
      const application = appRes.rows[0];

      // Block self-approval
      if (admin.id === application.user_id) {
        return NextResponse.json({ error: 'Self-approval of instructor applications is not permitted' }, { status: 400 });
      }

      // Enforce state transitions
      if (application.status !== 'pending') {
        return NextResponse.json({ error: 'Application is already ' + application.status }, { status: 400 });
      }

      const status = action === 'approve' ? 'approved' : 'rejected';
      await client.query(
        `UPDATE instructor_applications SET status = $1, updated_at = NOW() WHERE id = $2`,
        [status, id]
      );

      if (action === 'approve') {
        const { user_id, bio } = application;
        
        // Prevent duplicate profiles
        const checkInst = await client.query('SELECT id FROM instructors WHERE user_id = $1', [user_id]);
        if (checkInst.rows.length === 0) {
          await client.query(
            `INSERT INTO instructors (user_id, bio) VALUES ($1, $2)`,
            [user_id, bio]
          );
        }

        // Update user role & status
        await client.query(`UPDATE users SET role = 'instructor', status = 'active' WHERE id = $1`, [user_id]);
      } else {
        const { user_id } = application;
        await client.query(`UPDATE users SET role = 'learner' WHERE id = $1`, [user_id]);
      }

      // Log audit event
      const { logAdminAction } = await import('@/lib/audit');
      await logAdminAction(admin.id, `instructor_application_${action}`, 'instructor_application', id, { status: application.status }, { status });

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
