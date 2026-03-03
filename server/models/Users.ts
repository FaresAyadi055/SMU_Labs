import mongoose, { Schema, Document } from 'mongoose';

// 1. Define an interface representing a User document
export interface IUser extends Document {
  email: string;
  role: 'superadmin' | 'admin' | 'instructor' | 'student';
  magicIssuer?: string; // Optional because it's added after login
  createdAt: Date;
  updatedAt: Date;
}

// 2. Update the Schema to include magicIssuer
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
    required: false // Set to true if every user MUST have one
  }
}, {
  timestamps: true,
});

// 3. Export the typed model
const User = mongoose.model<IUser>('User', userSchema, 'users');
export default User;