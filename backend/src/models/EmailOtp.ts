import mongoose, { Document, Schema } from 'mongoose';

export type OtpPurpose = 'signup' | 'forgot_password' | 'change_password';

export interface IEmailOtp extends Document {
  email: string;
  purpose: OtpPurpose;
  otpHash: string;
  provider: 'local' | 'mojoauth';
  providerStateId?: string;
  attempts: number;
  maxAttempts: number;
  consumed: boolean;
  expiresAt: Date;
  createdAt: Date;
}

const EmailOtpSchema = new Schema<IEmailOtp>({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  purpose: {
    type: String,
    required: true,
    enum: ['signup', 'forgot_password', 'change_password'],
    index: true
  },
  otpHash: {
    type: String,
    required: true
  },
  provider: {
    type: String,
    enum: ['local', 'mojoauth'],
    default: 'local',
    index: true
  },
  providerStateId: {
    type: String
  },
  attempts: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 5
  },
  consumed: {
    type: Boolean,
    default: false,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

EmailOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IEmailOtp>('EmailOtp', EmailOtpSchema);
