import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendMail } from '@/lib/mail';
import { getBaseUrl } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, email, profile, password, phone, bio, linkedin } = await req.json();

    if (!email || !password || !firstName || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (profile === 'Instructor') {
      if (!bio || !linkedin) {
        return NextResponse.json({ error: 'Bio and LinkedIn URL are required for instructors' }, { status: 400 });
      }
      const linkedinRegex = /^https:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?$/;
      if (!linkedinRegex.test(linkedin)) {
        return NextResponse.json({ error: 'Please provide a valid LinkedIn profile URL (https://linkedin.com/in/...)' }, { status: 400 });
      }
    }

    // Check if user already exists
    const { rows: existing } = await pool.query('SELECT id, status FROM users WHERE email = $1', [email]);
    if (existing.length > 0) {
      const user = existing[0];
      if (user.status === 'active') {
        return NextResponse.json({ error: 'User already exists' }, { status: 400 });
      }
      // If pending_verification, we will update the existing record and resend the email
      console.log('User exists but unverified. Resending link...');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate secure verification token (instead of OTP)
    const verificationToken = crypto.randomBytes(32).toString('hex');
    // No expiration needed for links right now, but optional

    // Map the new UI roles directly to the DB roles
    // If they choose Instructor, set them as Instructor so the UI natively routes them exclusively to the /instructor portal
    const mappedRole = profile === 'Instructor' ? 'instructor' : 'learner';

    let userId: string;

    if (existing.length > 0) {
      // Update existing unverified user
      userId = existing[0].id;
      await pool.query(
        'UPDATE users SET first_name = $1, last_name = $2, phone = $3, password_hash = $4, verification_token = $5 WHERE id = $6',
        [firstName, lastName, phone, hashedPassword, verificationToken, userId]
      );
    } else {
      // Create new user
      const insertQuery = `
        INSERT INTO users (
          first_name, 
          last_name, 
          email, 
          phone,
          role, 
          password_hash, 
          email_verified, 
          status,
          verification_token
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
        RETURNING id, email
      `;

      const { rows } = await pool.query(insertQuery, [
        firstName,
        lastName,
        email,
        phone,
        mappedRole,
        hashedPassword,
        false, // email_verified 
        'pending_verification', // status
        verificationToken
      ]);
      userId = rows[0].id;

      // Handle instructor application data if provided during signup
      if (mappedRole === 'instructor' && bio) {
        await pool.query(
          'INSERT INTO instructor_applications (user_id, bio, linkedin_url, status) VALUES ($1, $2, $3, $4)',
          [userId, bio, linkedin || '', 'pending']
        );
      }
    }

    // Send verification email using nodemailer with Link
    const baseUrl = getBaseUrl(req);
    const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${verificationToken}`;

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const result = await sendMail({
        to: email,
        subject: 'Verify your XWORKS account',
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2>Welcome to XWORKS, ${firstName}!</h2>
            <p>Thanks for signing up! Please click the button below to verify your email and activate your account.</p>
            <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0;">Verify My Email →</a>
            <p>If the button doesn't work, copy and paste this link: ${verifyUrl}</p>
            <br/>
            <p>If you didn't create an account, you can safely ignore this email.</p>
          </div>
        `,
      });
      
      if (result.success) {
        console.log(`Verification link sent to ${email}`);
      } else {
        console.log(`[DEV MODE] Verification Link for ${email}: ${verifyUrl}`);
      }
    } else {
      console.warn('SMTP credentials not found. Link for dev is:', verifyUrl);
    }

    return NextResponse.json({
      message: 'User created successfully. Please check your email for the verification link.',
      user: { id: userId, email: email },
      needsVerification: true,
      email: email
    }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
