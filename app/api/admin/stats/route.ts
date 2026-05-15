import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import pool from '@/lib/db';

const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'your-default-secret-change-me'
);

async function checkAdmin() {
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

export async function GET() {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const usersCount = await pool.query("SELECT role, COUNT(*) FROM users GROUP BY role");
    const coursesCount = await pool.query("SELECT COUNT(*) FROM courses");
    const categoriesCount = await pool.query("SELECT COUNT(*) FROM categories");
    const enrolmentsCount = await pool.query("SELECT COUNT(*) FROM enrolments");

    const stats: any = {
      learners: 0,
      instructors: 0,
      admins: 0,
      courses: parseInt(coursesCount.rows[0].count),
      categories: parseInt(categoriesCount.rows[0].count),
      enrolments: parseInt(enrolmentsCount.rows[0].count)
    };

    usersCount.rows.forEach(r => {
      if (r.role === 'learner') stats.learners = parseInt(r.count);
      if (r.role === 'instructor') stats.instructors = parseInt(r.count);
      if (r.role === 'admin') stats.admins = parseInt(r.count);
    });

    return NextResponse.json({ stats });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
