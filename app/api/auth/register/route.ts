import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
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
    const { firstName, lastName, email: rawEmail, profile, password, phone, bio, linkedin } = await req.json();
    const email = rawEmail ? rawEmail.trim().toLowerCase() : '';

    if (!email || !password || !firstName || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
    }

    if (phone.length > 20 || !/^\+?[\d\s\-()]{7,20}$/.test(phone)) {
      return NextResponse.json({ error: 'Invalid phone number format or length' }, { status: 400 });
    }

    if (profile === 'Instructor') {
      if (process.env.ENABLE_INSTRUCTOR_APPLICATIONS !== 'true') {
        return NextResponse.json(
          { success: false, message: "Instructor onboarding is temporarily unavailable.", error: "Instructor onboarding is temporarily unavailable." },
          { status: 403 }
        );
      }

      if (!bio || !linkedin) {
        return NextResponse.json({ error: 'Bio and LinkedIn URL are required for instructors' }, { status: 400 });
      }
      const linkedinRegex = /^https:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?$/;
      if (!linkedinRegex.test(linkedin)) {
        return NextResponse.json({ error: 'Please provide a valid LinkedIn profile URL (https://linkedin.com/in/...)' }, { status: 400 });
      }
    }

    // Check if user already exists
    const { rows: existing } = await pool.query('SELECT id, status, password_hash, google_id FROM users WHERE email = $1', [email]);

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
      const user = existing[0];
      userId = user.id;
      if (user.status === 'active') {
        if (user.password_hash) {
          return NextResponse.json({ error: 'User already exists' }, { status: 400 });
        } else {
          // This is a Google-registered user who is active but does not have a password set.
          // We will update their metadata (first_name, last_name, phone, role) but NOT password_hash directly.
          // Instead, we will store the password_hash temporarily in the preferences JSONB column under 'pending_password_hash'.
          await pool.query(
            `UPDATE users 
             SET first_name = $1, 
                 last_name = $2, 
                 phone = $3, 
                 role = $4, 
                 verification_token = $5, 
                 verification_token_expires_at = NOW() + INTERVAL '48 hours',
                 preferences = jsonb_set(COALESCE(preferences, '{}'::jsonb), '{pending_password_hash}', to_jsonb($6::text)) 
             WHERE id = $7`,
            [firstName, lastName, phone, mappedRole, verificationToken, hashedPassword, userId]
          );

          // Handle instructor application data if provided during signup and they changed profile to instructor
          if (mappedRole === 'instructor' && bio) {
            const { rows: appRows } = await pool.query('SELECT id FROM instructor_applications WHERE user_id = $1', [userId]);
            if (appRows.length === 0) {
              await pool.query(
                'INSERT INTO instructor_applications (user_id, bio, linkedin_url, status) VALUES ($1, $2, $3, $4)',
                [userId, bio, linkedin || '', 'pending']
              );
            }
          }
        }
      } else {
        // If pending_verification, we will update the existing record and resend the email
        await pool.query(
          `UPDATE users 
           SET first_name = $1, 
               last_name = $2, 
               phone = $3, 
               password_hash = $4, 
               verification_token = $5, 
               verification_token_expires_at = NOW() + INTERVAL '48 hours'
           WHERE id = $6`,
          [firstName, lastName, phone, hashedPassword, verificationToken, userId]
        );
      }
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
          verification_token,
          verification_token_expires_at
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW() + INTERVAL '48 hours') 
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
