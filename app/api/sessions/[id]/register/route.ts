import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { jwtVerify } from 'jose';
import nodemailer from 'nodemailer';

const SESSION_SECRET = process.env.SESSION_SECRET || 'your-default-secret-change-me';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = (await params).id;
    const accessToken = req.cookies.get('access_token')?.value;
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { payload } = await jwtVerify(accessToken, new TextEncoder().encode(SESSION_SECRET));
    const userId = (payload as any).id;
    const userEmail = (payload as any).email;

    // 1. Get session details & course info
    const sessionRes = await pool.query(`
      SELECT s.*, c.name as course_name 
      FROM live_sessions s
      JOIN courses c ON s.course_id = c.id
      WHERE s.id = $1::uuid
    `, [sessionId]);

    if (sessionRes.rows.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const session = sessionRes.rows[0];

    // 2. Check if user is enrolled
    const enrolRes = await pool.query(
      'SELECT id FROM enrolments WHERE user_id = $1::uuid AND course_id = $2::uuid AND status = $3',
      [userId, session.course_id, 'active']
    );

    if (enrolRes.rows.length === 0) {
      return NextResponse.json({ error: 'Must be enrolled to register for a live session' }, { status: 403 });
    }

    const enrolmentId = enrolRes.rows[0].id;

    // 3. Check for existing registration
    const regCheck = await pool.query(
      'SELECT id FROM session_registrations WHERE enrolment_id = $1::uuid AND session_id = $2::uuid',
      [enrolmentId, sessionId]
    );

    if (regCheck.rows.length > 0) {
      return NextResponse.json({ error: 'Already registered for this session' }, { status: 400 });
    }

    // 4. Check seat availability
    if (session.max_seats && session.registered_count >= session.max_seats) {
      return NextResponse.json({ error: 'Session is full' }, { status: 400 });
    }

    // 5. Create registration
    await pool.query('BEGIN');
    try {
      await pool.query(
        `INSERT INTO session_registrations (enrolment_id, session_id, status, registered_at) 
         VALUES ($1::uuid, $2::uuid, 'registered', NOW())`,
        [enrolmentId, sessionId]
      );

      await pool.query(
        'UPDATE live_sessions SET registered_count = registered_count + 1 WHERE id = $1::uuid',
        [sessionId]
      );

      await pool.query('COMMIT');
    } catch (e) {
      await pool.query('ROLLBACK');
      throw e;
    }

    // 6. Send confirmation email
    const mailOptions = {
      from: `"XWORKS" <${process.env.SMTP_USER}>`,
      to: userEmail,
      subject: `Booking Confirmed: ${session.course_name} Live Session`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #4F46E5;">Booking Confirmed! ✅</h2>
          <p>Hi there,</p>
          <p>You've successfully registered for the live session of <strong>${session.course_name}</strong>.</p>
          <div style="background: #F8F9FF; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Session:</strong> ${session.title || 'Live Workshop'}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date(session.scheduled_start).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })}</p>
            <p style="margin: 5px 0;"><strong>Platform:</strong> ${session.platform || 'Zoom'}</p>
          </div>
          <p>The join link will be activated in your dashboard 10 minutes before the start time.</p>
          <a href="${req.nextUrl.origin}/dashboard" style="display: inline-block; background: #C74A4A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">Go to Dashboard</a>
          <p style="font-size: 12px; color: #666; margin-top: 30px;">
            If you need to reschedule or cancel, please do so at least 24 hours in advance.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ 
      success: true, 
      message: 'Registered successfully. Confirmation email sent.' 
    }, { status: 201 });

  } catch (error) {
    console.error('Session Registration Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
