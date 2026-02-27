import mongoose, { Schema, Document } from 'mongoose';

export interface ICallSession extends Document {
  type: 'voice' | 'video';
  initiatorId: mongoose.Types.ObjectId;
  participantIds: mongoose.Types.ObjectId[];
  status: 'ringing' | 'active' | 'ended';
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
}

const CallSessionSchema: Schema = new Schema({
  type: {
    type: String,
    enum: ['voice', 'video'],
    required: true
  },
  initiatorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participantIds: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  status: {
    type: String,
    enum: ['ringing', 'active', 'ended'],
    default: 'ringing'
  },
  startedAt: {
    type: Date
  },
  endedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model<ICallSession>('CallSession', CallSessionSchema);
