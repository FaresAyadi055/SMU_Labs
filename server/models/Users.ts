import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  role: 'superadmin' | 'admin' | 'instructor' | 'student';
  magicIssuer?: string;
  assignedClasses?: string[];
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
  assignedClasses: {
    type: [String],
    default: [],
    validate: {
      validator: function(this: IUser, value: string[]) {
        // Only validate for instructor role
        if (this.role === 'instructor') {
          return true; 
        }
        // For other roles, assignedClasses should be undefined or empty
        return !value || value.length === 0;
      },
      message: 'assignedClasses should only be used for instructor role'
    }
  }
}, {
  timestamps: true,
});

// Optional: Add an index for better query performance if you frequently query by assignedClasses
userSchema.index({ assignedClasses: 1 });

const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);

export default User;