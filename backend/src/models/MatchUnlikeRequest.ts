import mongoose, { Schema, Document } from 'mongoose';

export interface IMatchUnlikeRequest extends Document {
  matchId: mongoose.Types.ObjectId;
  requesterId: mongoose.Types.ObjectId;
  responderId: mongoose.Types.ObjectId;
  attemptsUsed: number;
  pending: boolean;
  lastRequestedAt?: Date;
  nextAllowedAt?: Date;
  autoUnmatchAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MatchUnlikeRequestSchema: Schema = new Schema(
  {
    matchId: {
      type: Schema.Types.ObjectId,
      ref: 'MatchRelationship',
      required: true,
      index: true
    },
    requesterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    responderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    attemptsUsed: {
      type: Number,
      default: 0
    },
    pending: {
      type: Boolean,
      default: false,
      index: true
    },
    lastRequestedAt: {
      type: Date
    },
    nextAllowedAt: {
      type: Date
    },
    autoUnmatchAt: {
      type: Date
    }
  },
  { timestamps: true }
);

MatchUnlikeRequestSchema.index({ matchId: 1, requesterId: 1, responderId: 1 }, { unique: true });

export default mongoose.model<IMatchUnlikeRequest>('MatchUnlikeRequest', MatchUnlikeRequestSchema);
