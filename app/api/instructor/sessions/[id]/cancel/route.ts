import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { jwtVerify } from 'jose';
import nodemailer from 'nodemailer';

const SESSION_SECRET = process.env.SESSION_SECRET || 'your-default-secret-change-me';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
  port: parseInt(process.env.SMTP_PORT || '2525', 10),
  auth: {
    user: process.env.SMTP_USER || 'user',
    pass: process.env.SMTP_PASS || 'pass',
  },
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const accessToken = req.cookies.get('access_token')?.value;
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { payload } = await jwtVerify(accessToken, new TextEncoder().encode(SESSION_SECRET));
    const userId = (payload as any).id;
    const { id: sessionId } = await params;

    // 1. Verify Instructor Ownership & Get Session Info
    const sessionRes = await pool.query(`
      SELECT ls.id as session_id, ls.scheduled_start, ls.title as session_title, c.name as course_name
      FROM live_sessions ls
      JOIN courses c ON ls.course_id = c.id
      JOIN instructors i ON c.instructor_id = i.id
      WHERE ls.id = $1 AND i.user_id = $2
    `, [sessionId, userId]);

    if (sessionRes.rows.length === 0) {
      return NextResponse.json({ error: 'Session not found or not owned by you' }, { status: 403 });
    }

    const sessionInfo = sessionRes.rows[0];
    const scheduledStart = new Date(sessionInfo.scheduled_start);
    const now = new Date();
    const isLessThan24h = (scheduledStart.getTime() - now.getTime()) < (24 * 60 * 60 * 1000);

    // 2. Mark Session as Cancelled
    await pool.query(`
      UPDATE live_sessions
      SET status = 'cancelled'
      WHERE id = $1
    `, [sessionId]);

    // 3. Find Registrants
    const registrantsRes = await pool.query(`
      SELECT u.email, u.first_name, e.id as enrolment_id
      FROM session_registrations sr
      JOIN enrolments e ON sr.enrolment_id = e.id
      JOIN users u ON e.user_id = u.id
      WHERE sr.session_id = $1
    `, [sessionId]);

    const registrants = registrantsRes.rows;

    const emailPromises = [];

    for (const reg of registrants) {
      // 4. Update Registration Status
      await pool.query(`
        UPDATE session_registrations
        SET status = 'cancelled'
        WHERE enrolment_id = $1 AND session_id = $2
      `, [reg.enrolment_id, sessionId]);

      // 5. Process Refund if less than 24h notice
      let refundNotice = '';
      if (isLessThan24h && reg.enrolment_id) {
        // We refund the associated payment
        const refundRes = await pool.query(`
          UPDATE payments
          SET status = 'refunded'
          WHERE enrolment_id = $1 AND status = 'successful'
          RETURNING id
        `, [reg.enrolment_id]);
        
        if (refundRes.rows.length > 0) {
          refundNotice = `\n\nBecause this cancellation occurred with less than 24 hours notice, you have been issued a full automatic refund. This will be reflected on your original payment method shortly.`;
        }
      }

      // 6. Notify via Email
      const emailBody = `
        Hi ${reg.first_name},
        
        Unfortunately, your upcoming live session "${sessionInfo.session_title}" for the course "${sessionInfo.course_name}" has been cancelled by the instructor.
        ${refundNotice}
        
        We apologize for any inconvenience.
        
        Thanks,
        XWORKS Team
        www.xworks.com
      `;

      emailPromises.push(
        transporter.sendMail({
          from: '"XWORKS Support" <support@xworks.com>',
          to: reg.email,
          subject: `Canceled: ${sessionInfo.session_title}`,
          text: emailBody.trim(),
        }).catch(err => console.error('Failed sending cancellation email:', err))
      );
    }

    // Await all notifications silently without blocking heavily
    await Promise.all(emailPromises);

    return NextResponse.json({ 
      success: true, 
      message: 'Session cancelled successfully', 
      registrantsNotified: registrants.length,
      refundsIssued: isLessThan24h 
    }, { status: 200 });

  } catch (error) {
    console.error('Session Cancellation API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
