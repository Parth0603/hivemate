import mongoose, { Schema, Document } from 'mongoose';

export interface IGig extends Document {
  creatorId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  skillsRequired: string[];
  type: 'job' | 'startup' | 'project' | 'hackathon';
  paymentStatus: 'paid' | 'unpaid';
  location?: string;
  duration?: string;
  compensation?: string;
  applicationDeadline?: Date;
  status: 'open' | 'closed' | 'in_progress' | 'completed';
  applicants: mongoose.Types.ObjectId[];
  acceptedApplicants: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const GigSchema: Schema = new Schema({
  creatorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    minlength: 10,
    maxlength: 5000
  },
  skillsRequired: {
    type: [String],
    required: true,
    validate: {
      validator: function(skills: string[]) {
        return skills.length > 0 && skills.length <= 20;
      },
      message: 'Must have between 1 and 20 skills'
    }
  },
  type: {
    type: String,
    enum: ['job', 'startup', 'project', 'hackathon'],
    required: true,
    index: true
  },
  paymentStatus: {
    type: String,
    enum: ['paid', 'unpaid'],
    required: true,
    index: true
  },
  location: {
    type: String,
    trim: true
  },
  duration: {
    type: String,
    trim: true
  },
  compensation: {
    type: String,
    trim: true
  },
  applicationDeadline: {
    type: Date
  },
  status: {
    type: String,
    enum: ['open', 'closed', 'in_progress', 'completed'],
    default: 'open',
    index: true
  },
  applicants: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  acceptedApplicants: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for efficient querying
GigSchema.index({ type: 1, status: 1 });
GigSchema.index({ skillsRequired: 1 });
GigSchema.index({ paymentStatus: 1, status: 1 });
GigSchema.index({ creatorId: 1, status: 1 });

GigSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model<IGig>('Gig', GigSchema);
