import mongoose, { Schema, Document } from 'mongoose';

export interface IMatchLike extends Document {
  senderId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  localDate: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MatchLikeSchema: Schema = new Schema(
  {
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
    localDate: {
      type: String,
      required: true,
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  { timestamps: true }
);

MatchLikeSchema.index({ senderId: 1, receiverId: 1 }, { unique: true });
MatchLikeSchema.index({ senderId: 1, localDate: 1, isActive: 1 });

export default mongoose.model<IMatchLike>('MatchLike', MatchLikeSchema);
