import mongoose, { Schema, Document } from 'mongoose';

export interface IFriendship extends Document {
  user1Id: mongoose.Types.ObjectId;
  user2Id: mongoose.Types.ObjectId;
  establishedAt: Date;
  communicationLevel: 'chat' | 'voice' | 'video';
  interactionCount: number;
  blocked: boolean;
}

const FriendshipSchema: Schema = new Schema({
  user1Id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  user2Id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  establishedAt: {
    type: Date,
    default: Date.now
  },
  communicationLevel: {
    type: String,
    enum: ['chat', 'voice', 'video'],
    default: 'chat'
  },
  interactionCount: {
    type: Number,
    default: 0
  },
  blocked: {
    type: Boolean,
    default: false
  }
});

// Compound indexes for efficient friendship queries
FriendshipSchema.index({ user1Id: 1, user2Id: 1 }, { unique: true });
FriendshipSchema.index({ user1Id: 1, blocked: 1 });
FriendshipSchema.index({ user2Id: 1, blocked: 1 });
FriendshipSchema.index({ user1Id: 1, user2Id: 1, blocked: 1 });

export default mongoose.model<IFriendship>('Friendship', FriendshipSchema);
