import mongoose, { Schema, Document } from 'mongoose';

export interface IMatchRelationship extends Document {
  userAId: mongoose.Types.ObjectId;
  userBId: mongoose.Types.ObjectId;
  status: 'active' | 'unmatched';
  matchedAt?: Date;
  unmatchedAt?: Date;
  rematchBlockedUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MatchRelationshipSchema: Schema = new Schema(
  {
    userAId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    userBId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['active', 'unmatched'],
      default: 'active',
      index: true
    },
    matchedAt: {
      type: Date
    },
    unmatchedAt: {
      type: Date
    },
    rematchBlockedUntil: {
      type: Date
    }
  },
  { timestamps: true }
);

MatchRelationshipSchema.index({ userAId: 1, userBId: 1 }, { unique: true });
MatchRelationshipSchema.index({ status: 1, rematchBlockedUntil: 1 });

export default mongoose.model<IMatchRelationship>('MatchRelationship', MatchRelationshipSchema);
