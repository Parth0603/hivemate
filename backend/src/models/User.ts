import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  username?: string;
  passwordHash: string;
  emailVerified: boolean;
  createdAt: Date;
  lastLogin: Date;
  status: 'active' | 'suspended' | 'deleted';
}

const UserSchema: Schema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  username: {
    type: String,
    trim: true,
    lowercase: true,
    unique: true,
    sparse: true,
    index: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  emailVerified: {
    type: Boolean,
    default: false,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'deleted'],
    default: 'active'
  }
});

export default mongoose.model<IUser>('User', UserSchema);
