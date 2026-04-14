import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: (process.env.SMTP_HOST || "smtp.zeptomail.in").trim(),
  port: parseInt((process.env.SMTP_PORT || "587").trim()),
  secure: (process.env.SMTP_PORT || "").trim() === "465",
  auth: {
    user: (process.env.EMAIL_USER || "").trim(),
    pass: (process.env.EMAIL_PASS || "").trim(),
  },
});

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export const sendMail = async ({ to, subject, html, text, from }: SendMailOptions) => {
  const fromAddress = from || process.env.SMTP_FROM || '"XWORKS Team" <noreply@celtm.com>';
  
  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>?/gm, ''),
    });
    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
};

export default transporter;
