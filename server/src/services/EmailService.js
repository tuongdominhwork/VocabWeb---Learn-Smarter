import nodemailer from 'nodemailer';

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendPasswordResetEmail(email, token) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetLink = `${frontendUrl}/reset-password?token=${token}`;

  const transporter = createTransport();

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'noreply@vocabweb.app',
    to: email,
    subject: 'VocabWeb — Password Reset',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a1a2e;">Reset Your Password</h2>
        <p>You requested a password reset for your VocabWeb account.</p>
        <p>Click the button below to set a new password. This link expires in 1 hour.</p>
        <a href="${resetLink}"
           style="display: inline-block; padding: 12px 24px; background: #6366f1;
                  color: white; border-radius: 8px; text-decoration: none; margin: 16px 0;">
          Reset Password
        </a>
        <p style="color: #666; font-size: 14px;">
          Or copy this link: <br/>
          <a href="${resetLink}">${resetLink}</a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;"/>
        <p style="color: #999; font-size: 12px;">
          If you didn't request this, ignore this email — your account is safe.
        </p>
      </div>
    `,
  });
}
