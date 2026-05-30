import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { jwtVerify } from 'jose';
import { createNotification } from '@/lib/notifications';

const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'your-default-secret-change-me'
);

async function checkLearner(req: NextRequest) {
  const accessToken = req.cookies.get('access_token')?.value;
  if (!accessToken) return null;
  try {
    const { payload } = await jwtVerify(accessToken, SESSION_SECRET);
    return payload as any;
  } catch {
    return null;
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await checkLearner(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: enrolmentId } = await params;
  if (!enrolmentId) {
    return NextResponse.json({ error: 'Missing enrolment ID' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    const body = await req.json();
    const progressVal = parseFloat(body.progress_pct);

    if (isNaN(progressVal) || progressVal < 0 || progressVal > 100) {
      return NextResponse.json({ error: 'Invalid progress_pct value. Must be between 0 and 100.' }, { status: 400 });
    }

    await client.query('BEGIN');

    // Fetch enrolment and course details with row lock
    const enrolRes = await client.query(`
      SELECT e.id, e.user_id, e.course_id, e.status, e.progress_pct, c.name as course_name, c.live, u.email, u.first_name
      FROM enrolments e
      JOIN courses c ON e.course_id = c.id
      JOIN users u ON e.user_id = u.id
      WHERE e.id = $1 FOR UPDATE
    `, [enrolmentId]);

    if (enrolRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Enrolment not found' }, { status: 404 });
    }

    const enrolment = enrolRes.rows[0];

    // Verify ownership
    if (enrolment.user_id !== user.id) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update progress
    await client.query(`
      UPDATE enrolments 
      SET progress_pct = $1, last_accessed_at = NOW() 
      WHERE id = $2
    `, [progressVal, enrolmentId]);

    let completed = false;
    let certGenerated = false;

    // Check if progress reached 100%
    if (progressVal >= 100 && enrolment.status !== 'completed') {
      completed = true;
      
      // Update enrolment to completed
      await client.query(`
        UPDATE enrolments 
        SET status = 'completed', completed_at = NOW() 
        WHERE id = $1
      `, [enrolmentId]);

      // Certificate generation logic
      // Issue certificate immediately if course is recorded (not live)
      // Or if live, check if they attended the session (attendance_status = 'attended')
      let eligible = false;
      if (!enrolment.live) {
        eligible = true;
      } else {
        // Live course: check if they have at least one session registration with 'attended' status
        const attendCheck = await client.query(`
          SELECT id FROM session_registrations 
          WHERE enrolment_id = $1 AND attendance_status = 'attended'
          LIMIT 1
        `, [enrolmentId]);
        if (attendCheck.rows.length > 0) {
          eligible = true;
        }
      }

      if (eligible) {
        const credentialId = 'XW-' + Math.random().toString(16).substring(2, 10).toUpperCase();
        
        const certRes = await client.query(`
          INSERT INTO certificates (credential_id, user_id, course_id, enrolment_id, status, issued_at)
          VALUES ($1, $2, $3, $4, 'issued', NOW())
          ON CONFLICT (enrolment_id) DO NOTHING
          RETURNING credential_id
        `, [credentialId, enrolment.user_id, enrolment.course_id, enrolmentId]);

        if (certRes.rows.length > 0) {
          certGenerated = true;
          
          // Send completion and certificate notification
          await createNotification({
            userId: enrolment.user_id,
            title: 'Course Completed! 🎓',
            message: `Congratulations! You have completed the course "${enrolment.course_name}" and your certificate has been generated.`,
            type: 'success',
            sendEmail: true,
            emailTo: enrolment.email,
            emailSubject: `Course Completed: ${enrolment.course_name}`,
            emailHtml: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #4F46E5;">Congratulations! 🎓</h2>
                <p>Hi ${enrolment.first_name},</p>
                <p>You have successfully completed the course <strong>${enrolment.course_name}</strong>.</p>
                <p>Your completion certificate has been generated.</p>
                <a href="${req.nextUrl.origin}/dashboard?view=certificates" style="display: inline-block; background: #C74A4A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">View Certificate</a>
              </div>
            `
          });
        }
      }
    }

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      progress_pct: progressVal,
      completed,
      certificateIssued: certGenerated
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Progress Update API Error:', err);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  } finally {
    client.release();
  }
}
