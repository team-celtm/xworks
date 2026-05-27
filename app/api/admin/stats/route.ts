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
    const learnersRes = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'learner'");
    const instructorsRes = await pool.query(
      `SELECT COUNT(*) FROM instructors i JOIN users u ON i.user_id = u.id WHERE u.role = 'instructor'`
    );
    const coursesRes = await pool.query("SELECT COUNT(*) FROM courses WHERE status = 'published'");
    const enrolmentsRes = await pool.query("SELECT COUNT(*) FROM enrolments");

    return NextResponse.json({
      totalLearners: parseInt(learnersRes.rows[0].count),
      totalInstructors: parseInt(instructorsRes.rows[0].count),
      activeCourses: parseInt(coursesRes.rows[0].count),
      totalEnrolments: parseInt(enrolmentsRes.rows[0].count)
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
