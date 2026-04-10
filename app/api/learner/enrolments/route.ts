import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { jwtVerify } from 'jose';

const SESSION_SECRET = process.env.SESSION_SECRET || 'your-default-secret-change-me';

export async function GET(req: NextRequest) {
  try {
    const accessToken = req.cookies.get('access_token')?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify JWT
    let payload: any;
    try {
      const { payload: jwtPayload } = await jwtVerify(
        accessToken,
        new TextEncoder().encode(SESSION_SECRET)
      );
      payload = jwtPayload;
    } catch (err) {
      console.error('JWT verification failed:', err);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = payload.id;

    // Fetch enrolments with course and session info
    const sql = `
      SELECT 
        e.id as enrolment_id,
        e.progress_pct as "progressPct",
        e.status as enrolment_status,
        e.enrolled_at as "enrolledAt",
        e.completed_at as "completedAt",
        c.id as course_id,
        c.name,
        c.slug,
        c.emoji,
        c.g as "thumbBg",
        c.live,
        c.dur,
        c.rating,
        c.price as "basePrice",
        cat.name as "catLabel",
        (u.first_name || ' ' || u.last_name) as instructor,
        ls.scheduled_start as "scheduledStart",
        ls.scheduled_end as "scheduledEnd",
        ls.status as "sessionStatus",
        p.status as "paymentStatus",
        (SELECT id FROM session_registrations WHERE enrolment_id = e.id AND session_id = ls.id LIMIT 1) as "userSessionRegId"
      FROM enrolments e
      JOIN courses c ON e.course_id = c.id
      JOIN categories cat ON c.category_id = cat.id
      JOIN instructors i ON c.instructor_id = i.id
      JOIN users u ON i.user_id = u.id
      LEFT JOIN payments p ON e.id = p.enrolment_id::uuid
      LEFT JOIN LATERAL (
        SELECT id, scheduled_start, scheduled_end, status
        FROM live_sessions
        WHERE course_id = c.id AND scheduled_start >= NOW()
        ORDER BY scheduled_start ASC
        LIMIT 1
      ) ls ON true
      WHERE e.user_id = $1::uuid
      ORDER BY e.enrolled_at DESC
    `;

    const { rows } = await pool.query(sql, [userId]);

    // Format numbers
    const payloadResult = rows.map(r => ({
      ...r,
      progressPct: parseFloat(r.progressPct),
      dur: parseInt(r.dur, 10),
      rating: parseFloat(r.rating)
    }));

    return NextResponse.json(payloadResult, { status: 200 });
  } catch (error) {
    console.error('API Error /learner/enrolments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const accessToken = req.cookies.get('access_token')?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify JWT
    let payload: any;
    try {
      const { payload: jwtPayload } = await jwtVerify(
        accessToken,
        new TextEncoder().encode(SESSION_SECRET)
      );
      payload = jwtPayload;
    } catch (err) {
      console.error('JWT verification failed:', err);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = payload.id;
    const body = await req.json();
    const { courseId, sessionId } = body;

    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });
    }

    // Check if course is free
    const courseSql = 'SELECT price, name FROM courses WHERE id = $1';
    const courseRes = await pool.query(courseSql, [courseId]);
    
    if (courseRes.rows.length === 0) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const price = Number(courseRes.rows[0].price);
    const courseName = courseRes.rows[0].name;

    if (price > 0) {
      return NextResponse.json({ 
        error: 'This is a paid course. Please proceed to payment.',
        requiresPayment: true 
      }, { status: 402 });
    }

    // Check if already enrolled (actively)
    const checkSql = "SELECT id FROM enrolments WHERE user_id = $1 AND course_id = $2 AND status = 'active'";
    const checkRes = await pool.query(checkSql, [userId, courseId]);

    let enrolmentId;
    if (checkRes.rows.length > 0) {
      enrolmentId = checkRes.rows[0].id;
      // If session provided, we might still want to register if not registered
    } else {
      // Create enrolment
      const insertSql = `
        INSERT INTO enrolments (
          user_id, course_id, status, progress_pct, enrolled_at, 
          price_paid_paise, currency, source
        )
        VALUES ($1, $2, 'active', 0, NOW(), 0, 'INR', 'direct')
        RETURNING id
      `;
      const insertRes = await pool.query(insertSql, [userId, courseId]);
      enrolmentId = insertRes.rows[0].id;
    }

    // Handle Session Registration if provided
    if (sessionId) {
      const { rows: sessionExists } = await pool.query(
        'SELECT id FROM session_registrations WHERE user_id = $1 AND live_session_id = $2',
        [userId, sessionId]
      );
      
      if (sessionExists.length === 0) {
        await pool.query(
          'INSERT INTO session_registrations (user_id, live_session_id, enrolment_id, registered_at) VALUES ($1, $2, $3, NOW())',
          [userId, sessionId, enrolmentId]
        );
      }
    }

    return NextResponse.json({ 
      success: true, 
      enrolmentId,
      message: `Successfully enrolled in ${courseName}`
    }, { status: 201 });

  } catch (error) {
    console.error('API Error /learner/enrolments POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
