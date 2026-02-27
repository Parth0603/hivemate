import mongoose, { Schema, Document } from 'mongoose';

export interface IConnectionRequest extends Document {
  senderId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
  respondedAt?: Date;
}

const ConnectionRequestSchema: Schema = new Schema({
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  receiverId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending',
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  respondedAt: {
    type: Date
  }
});

// Compound indexes for efficient queries
ConnectionRequestSchema.index({ senderId: 1, receiverId: 1 }, { unique: true });
ConnectionRequestSchema.index({ receiverId: 1, status: 1 });
ConnectionRequestSchema.index({ senderId: 1, status: 1 });

export default mongoose.model<IConnectionRequest>('ConnectionRequest', ConnectionRequestSchema);
