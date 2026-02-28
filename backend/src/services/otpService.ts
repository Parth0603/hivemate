import crypto from 'crypto';
import EmailOtp, { OtpPurpose } from '../models/EmailOtp';
import { MojoAuthService } from './mojoAuthService';

const OTP_TTL_MINUTES = parseInt(process.env.OTP_TTL_MINUTES || '10', 10);
const OTP_SECRET = process.env.OTP_SECRET || 'change-this-otp-secret';
const getOtpProvider = (): 'local' | 'mojoauth' => {
  const configured = MojoAuthService.isConfigured();
  const envProvider = (process.env.OTP_PROVIDER || '').trim().toLowerCase();
  if (envProvider === 'mojoauth' && configured) return 'mojoauth';
  if (!envProvider && configured) return 'mojoauth';
  return 'local';
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const hashOtp = (otp: string) => crypto.createHash('sha256').update(`${otp}:${OTP_SECRET}`).digest('hex');

export class OtpService {
  static usesManagedProvider(): boolean {
    return getOtpProvider() === 'mojoauth';
  }

  static generateOtp(): string {
    return `${Math.floor(100000 + Math.random() * 900000)}`;
  }

  static async createOtp(email: string, purpose: OtpPurpose): Promise<string> {
    const normalizedEmail = normalizeEmail(email);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
    const isProduction = process.env.NODE_ENV === 'production';

    await EmailOtp.deleteMany({
      email: normalizedEmail,
      purpose,
      consumed: false
    });

    if (this.usesManagedProvider()) {
      try {
        const stateId = await MojoAuthService.sendEmailOtp(normalizedEmail);
        await EmailOtp.create({
          email: normalizedEmail,
          purpose,
          otpHash: hashOtp(stateId),
          provider: 'mojoauth',
          providerStateId: stateId,
          expiresAt
        });
        return '';
      } catch (error) {
        if (isProduction) {
          throw error;
        }
        console.warn(`MojoAuth OTP failed for ${normalizedEmail}, falling back to local OTP in development.`);
      }
    }

    const otp = this.generateOtp();
    await EmailOtp.create({
      email: normalizedEmail,
      purpose,
      otpHash: hashOtp(otp),
      provider: 'local',
      expiresAt
    });

    return otp;
  }

  static async verifyOtp(email: string, purpose: OtpPurpose, otp: string): Promise<boolean> {
    const normalizedEmail = normalizeEmail(email);
    const record = await EmailOtp.findOne({
      email: normalizedEmail,
      purpose,
      consumed: false,
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    if (!record) {
      return false;
    }

    if (record.attempts >= record.maxAttempts) {
      record.consumed = true;
      await record.save();
      return false;
    }

    let isValid = false;
    if (record.provider === 'mojoauth') {
      isValid = await MojoAuthService.verifyEmailOtp(otp, record.providerStateId || '');
    } else {
      isValid = record.otpHash === hashOtp(otp);
    }

    if (!isValid) {
      record.attempts += 1;
      if (record.attempts >= record.maxAttempts) {
        record.consumed = true;
      }
      await record.save();
      return false;
    }

    record.consumed = true;
    await record.save();
    return true;
  }
}
