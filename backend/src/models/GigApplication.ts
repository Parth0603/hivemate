import mongoose, { Schema, Document } from 'mongoose';

export interface IGigApplication extends Document {
  gigId: mongoose.Types.ObjectId;
  applicantId: mongoose.Types.ObjectId;
  status: 'pending' | 'accepted' | 'rejected';
  coverLetter?: string;
  appliedAt: Date;
  respondedAt?: Date;
}

const GigApplicationSchema: Schema = new Schema({
  gigId: {
    type: Schema.Types.ObjectId,
    ref: 'Gig',
    required: true,
    index: true
  },
  applicantId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending',
    index: true
  },
  coverLetter: {
    type: String,
    maxlength: 2000
  },
  appliedAt: {
    type: Date,
    default: Date.now
  },
  respondedAt: {
    type: Date
  }
});

// Compound index to prevent duplicate applications
GigApplicationSchema.index({ gigId: 1, applicantId: 1 }, { unique: true });

export default mongoose.model<IGigApplication>('GigApplication', GigApplicationSchema);
