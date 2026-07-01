import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import crypto from 'crypto';
import { sendMail } from '@/lib/mail';
import { getBaseUrl } from '@/lib/utils';
import { isRateLimited } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests. Please try again in 15 minutes.' }, { status: 429 });
  }

  try {
    const { email: rawEmail } = await req.json();
    const email = rawEmail ? rawEmail.trim().toLowerCase() : '';

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const { rows } = await pool.query('SELECT id, first_name FROM users WHERE email = $1 AND status = $2', [email, 'active']);

    if (rows.length === 0) {
      // Return a generic success message even if the user doesn't exist to prevent email enumeration
      return NextResponse.json({ message: "If an account exists for this email, we've sent a link to reset your password." });
    }

    const user = rows[0];
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Update DB with reset token and 10-minute expiration
    await pool.query(
      `UPDATE users SET reset_password_token = $1, reset_password_expires_at = NOW() + INTERVAL '10 minutes' WHERE id = $2`,
      [resetToken, user.id]
    );

    const baseUrl = getBaseUrl(req);
    const resetUrl = `${baseUrl}/Login?reset_token=${resetToken}`;

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const result = await sendMail({
        to: email,
        subject: 'Reset your XWORKS password',
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <img src="${baseUrl}/favicon.svg" alt="XWORKS Logo" style="max-height: 40px; margin-bottom: 20px;" />
            <h2>Hello ${user.first_name},</h2>
            <p>We received a request to reset your XWORKS password.</p>
            <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0;">Reset Password →</a>
            <p>Or copy this link: ${resetUrl}</p>
            <p>This link will expire in 10 minutes.</p>
            <br/>
            <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
          </div>
        `,
      });

      if (!result.success) {
        console.warn('Failed to send password reset email:', result.error);
      }
    } else {
      console.warn('SMTP credentials not found, cannot send password reset email.');
    }

    return NextResponse.json({ message: "If an account exists for this email, we've sent a link to reset your password." });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
