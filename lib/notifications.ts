import pool from './db';
import { sendMail } from './mail';

export async function createNotification({
  userId,
  role,
  title,
  message,
  type = 'info',
  sendEmail = false,
  emailTo,
  emailSubject,
  emailHtml
}: {
  userId?: string | null;
  role?: string | null;
  title: string;
  message: string;
  type?: string;
  sendEmail?: boolean;
  emailTo?: string;
  emailSubject?: string;
  emailHtml?: string;
}) {
  try {
    // Insert in-app notification
    await pool.query(
      `INSERT INTO notifications (user_id, role, title, message, type) VALUES ($1, $2, $3, $4, $5)`,
      [userId || null, role || null, title, message, type]
    );

    // Send email notification if requested
    if (sendEmail && emailTo) {
      await sendMail({
        to: emailTo,
        subject: emailSubject || title,
        html: emailHtml || `<p>${message}</p>`,
        text: message
      });
    }
  } catch (error) {
    console.error('[Notification Helper Error]:', error);
  }
}
