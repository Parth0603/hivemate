import mongoose, { Schema, Document } from 'mongoose';

export interface IEncryptionKey extends Document {
  userId: mongoose.Types.ObjectId;
  publicKey: string;
  privateKey?: string;
  createdAt: Date;
}

const EncryptionKeySchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  publicKey: {
    type: String,
    required: true
  },
  privateKey: {
    type: String,
    required: false,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model<IEncryptionKey>('EncryptionKey', EncryptionKeySchema);
