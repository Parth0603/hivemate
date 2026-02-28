import nodemailer from 'nodemailer';
import { OtpPurpose } from '../models/EmailOtp';

const MAIL_FROM = process.env.MAIL_FROM || process.env.MAIL_USER || '';
const OTP_MAIL_SUBJECT_PREFIX = process.env.OTP_MAIL_SUBJECT_PREFIX || 'HiveMate';

const createTransport = () => {
  const host = (process.env.MAIL_HOST || '').trim();
  const port = parseInt(process.env.MAIL_PORT || '587', 10);
  const secure = process.env.MAIL_SECURE === 'true';
  const user = (process.env.MAIL_USER || '').trim();
  const pass = (process.env.MAIL_PASS || '').replace(/\s+/g, '').trim();

  if (!host || !user || !pass || !MAIL_FROM) {
    throw new Error('Mail service is not configured. Set MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS, MAIL_FROM.');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass
    }
  });
};

const getPurposeLabel = (purpose: OtpPurpose): string => {
  switch (purpose) {
    case 'signup':
      return 'verify your email';
    case 'forgot_password':
      return 'reset your password';
    case 'change_password':
      return 'confirm your password change';
    default:
      return 'verify your action';
  }
};

export class EmailService {
  static async sendOtpEmail(email: string, otp: string, purpose: OtpPurpose): Promise<void> {
    const transporter = createTransport();
    const action = getPurposeLabel(purpose);
    const subject = `${OTP_MAIL_SUBJECT_PREFIX} OTP - ${action}`;

    await transporter.sendMail({
      from: MAIL_FROM,
      to: email,
      subject,
      text: `Your HiveMate OTP is ${otp}. This code expires in 10 minutes. Do not share this code with anyone.`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:20px;color:#111827">
          <h2 style="margin:0 0 12px 0;color:#0f2f63">HiveMate verification</h2>
          <p style="margin:0 0 10px 0;">Use this OTP to ${action}:</p>
          <div style="font-size:32px;font-weight:700;letter-spacing:6px;padding:14px 18px;background:#f3f6ff;border-radius:10px;width:max-content">${otp}</div>
          <p style="margin:14px 0 0 0;color:#4b5563">This code expires in 10 minutes.</p>
          <p style="margin:8px 0 0 0;color:#4b5563">If you did not request this, ignore this email.</p>
        </div>
      `
    });
  }
}
