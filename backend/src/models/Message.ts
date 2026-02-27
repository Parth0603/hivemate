import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  chatRoomId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  encryptedContent: string;
  senderEncryptedContent?: string;
  timestamp: Date;
  delivered: boolean;
  read: boolean;
  deletedForEveryone: boolean;
  deletedForUsers: mongoose.Types.ObjectId[];
  deletedAt?: Date;
}

const MessageSchema: Schema = new Schema({
  chatRoomId: {
    type: Schema.Types.ObjectId,
    ref: 'ChatRoom',
    required: true,
    index: true
  },
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiverId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  encryptedContent: {
    type: String,
    required: true
  },
  senderEncryptedContent: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  delivered: {
    type: Boolean,
    default: false
  },
  read: {
    type: Boolean,
    default: false
  },
  deletedForEveryone: {
    type: Boolean,
    default: false
  },
  deletedForUsers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  deletedAt: {
    type: Date
  }
});

// Compound index for efficient message queries
MessageSchema.index({ chatRoomId: 1, timestamp: -1 });

export default mongoose.model<IMessage>('Message', MessageSchema);
