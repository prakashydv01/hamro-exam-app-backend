import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  const subject = 'Your Hamro Exam verification code';
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Verify your email</h2>
      <p>Your one-time verification code is:</p>
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 4px;">${otp}</p>
      <p>This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
    </div>
  `;

  if (!resend) {
    // Dev fallback so local development doesn't require a Resend account.
    // Remove/guard this in production if you don't want OTPs in logs.
    console.log(`[DEV EMAIL] OTP for ${to}: ${otp}`);
    return;
  }

  await resend.emails.send({
    from: process.env.EMAIL_FROM || 'Hamro Exam <noreply@hamroexam.com>',
    to,
    subject,
    html,
  });
}
export async function sendPasswordResetEmail(to: string, otp: string): Promise<void> {
  const subject = 'Reset your Hamro Exam password';
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Reset your password</h2>
      <p>Someone requested a password reset for this account. Use the code below to continue:</p>
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 4px;">${otp}</p>
      <p>This code expires in 10 minutes. If you didn't request this, you can safely ignore this email - your password will not be changed.</p>
    </div>
  `;

  if (!resend) {
    console.log(`[DEV EMAIL] Password reset OTP for ${to}: ${otp}`);
    return;
  }

  await resend.emails.send({
    from: process.env.EMAIL_FROM || 'Hamro Exam <noreply@hamroexam.com>',
    to,
    subject,
    html,
  });
}