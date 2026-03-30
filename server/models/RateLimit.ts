import mongoose, { Schema, Document } from 'mongoose';

export interface IRateLimit extends Document {
  key: string;      // Identifier (e.g., IP address or IP + endpoint)
  points: number;   // Number of requests made
  expireAt: Date;   // TTL for the record
}

const rateLimitSchema = new Schema<IRateLimit>({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  points: {
    type: Number,
    required: true,
    default: 0
  },
  expireAt: {
    type: Date,
    required: true,
    index: { expires: 0 } // Use the date itself as the expiration time
  }
}, {
  timestamps: true,
});

const RateLimit = mongoose.models.RateLimit || mongoose.model<IRateLimit>('RateLimit', rateLimitSchema);

export default RateLimit;