import mongoose, { Schema, Document } from 'mongoose';

export interface ILocation extends Document {
  userId: mongoose.Types.ObjectId;
  coordinates: {
    type: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
  mode: 'explore' | 'vanish';
  timestamp: Date;
  accuracy: number;
}

const LocationSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  coordinates: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  mode: {
    type: String,
    enum: ['explore', 'vanish'],
    required: true,
    default: 'vanish',
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  accuracy: {
    type: Number,
    required: true,
    default: 0
  }
});

// Create 2dsphere index for geospatial queries
LocationSchema.index({ coordinates: '2dsphere' });

// Compound index for efficient queries
LocationSchema.index({ userId: 1, mode: 1 });

export default mongoose.model<ILocation>('Location', LocationSchema);
