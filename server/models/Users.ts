import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  role: 'superadmin' | 'admin' | 'instructor' | 'student';
  magicIssuer?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['superadmin', 'admin', 'instructor', 'student'],
    required: true,
    default: 'student'
  },
  magicIssuer: {
    type: String,
    required: false
  }
}, {
  timestamps: true,
});

// Use this pattern for all models to avoid "Schema hasn't been registered" errors
const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);

export default User;