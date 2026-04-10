import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    // Basic internal authentication could happen here
    const body = await req.json();
    const { userId, courseId, enrolmentId } = body;

    if (!userId || !courseId || !enrolmentId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Generate credential ID
    const randomHex = Math.random().toString(16).substring(2, 10).toUpperCase();
    const credentialId = `XW-${randomHex}`;

    // 2. Insert certificate row
    const certSql = `
      INSERT INTO certificates (credential_id, user_id, course_id, enrolment_id, status)
      VALUES ($1, $2, $3, $4, 'issued')
      ON CONFLICT (enrolment_id) DO NOTHING
      RETURNING *
    `;
    const { rows } = await pool.query(certSql, [credentialId, userId, courseId, enrolmentId]);

    if (rows.length === 0) {
      // Certificate already generated for this enrolment
      return NextResponse.json({ message: 'Certificate already exists', queued: false }, { status: 200 });
    }

    const certificate = rows[0];

    // 3. Queue PDF generation (mocking this as a background task)
    console.log(`[Job Queue] Queueing PDF generation for certificate ${certificate.id}`);
    const pdfUrl = `https://cdn.xworks.com/certs/${credentialId}.pdf`;
    await pool.query('UPDATE certificates SET pdf_url = $1 WHERE id = $2', [pdfUrl, certificate.id]);

    // 4. Send email
    // Fetch user details
    const userResult = await pool.query('SELECT first_name, email FROM users WHERE id = $1', [userId]);
    const courseResult = await pool.query('SELECT name FROM courses WHERE id = $1', [courseId]);
    
    if (userResult.rows.length > 0 && courseResult.rows.length > 0) {
      const user = userResult.rows[0];
      const course = courseResult.rows[0];

      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT || '587'),
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        await transporter.sendMail({
          from: `"XWORKS Academy" <${process.env.SMTP_USER}>`,
          to: user.email,
          subject: `Congratulations on completing ${course.name}!`,
          text: `Hi ${user.first_name},\n\nYou have successfully completed the ${course.name} course! Your certificate ID is ${credentialId}.\n\nYou can view it on your dashboard.\n\nBest,\nXWORKS Team`,
          html: `<h3>Hi ${user.first_name},</h3><p>You have successfully completed the <strong>${course.name}</strong> course!</p><p>Your certificate ID is <b>${credentialId}</b>.</p><p>You can view and download it from certificates dashboard.</p><br><p>Best,<br>XWORKS Team</p>`
        });
        console.log(`[Email] Certificate email sent to ${user.email}`);
      } catch (err) {
        console.error('[Email] Failed to send certificate email:', err);
      }
    }

    return NextResponse.json({ 
      success: true, 
      certificate, 
      pdfQueued: true 
    }, { status: 201 });

  } catch (error) {
    console.error('Certificate Generation Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
