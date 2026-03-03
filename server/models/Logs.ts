import mongoose, { Schema, Document } from 'mongoose';

// Define possible action types
export type ActionType = 
  | 'INVENTORY_UPDATE'
  | 'INVENTORY_CREATE'
  | 'INVENTORY_DELETE'
  | 'REQUEST_CREATE'
  | 'REQUEST_APPROVE'
  | 'REQUEST_DECLINE'
  | 'REQUEST_RETURN'
  | 'USER_LOGIN'
  | 'USER_CREATE'
  | 'USER_UPDATE'
  | 'USER_DELETE';

// Define the structure for different action metadata
export interface ILog extends Document {
  action: ActionType;
  userId: mongoose.Types.ObjectId;
  userEmail: string;
  userRole: string;
  timestamp: Date;
  ip?: string;
  userAgent?: string;
  
  // Flexible metadata based on action type
  metadata: {
    // Common fields
    entityId?: mongoose.Types.ObjectId;
    entityType?: string;
    
    // Before/after changes (for updates)
    before?: any;
    after?: any;
    
    // Changes summary
    changes?: {
      field: string;
      oldValue: any;
      newValue: any;
    }[];
    
    // For inventory updates
    quantity?: {
      previous: number;
      new: number;
      change: number;
    };
    
    // For requests
    requestStatus?: string;
    itemId?: mongoose.Types.ObjectId;
    itemModel?: string;
    
    // Additional flexible fields
    description?: string;
    reason?: string;
    [key: string]: any;
  };
  
  // For grouping related actions
  sessionId?: string;
  transactionId?: string; // This should be a string, not an object
  
  createdAt: Date;
  updatedAt: Date;
}

const logSchema = new Schema<ILog>({
  action: {
    type: String,
    enum: [
      'INVENTORY_UPDATE',
      'INVENTORY_CREATE',
      'INVENTORY_DELETE',
      'REQUEST_CREATE',
      'REQUEST_APPROVE',
      'REQUEST_DECLINE',
      'REQUEST_RETURN',
      'REQUEST_CANCEL',
      'USER_LOGIN',
      'USER_CREATE',
      'USER_UPDATE',
      'USER_DELETE'
    ],
    required: true,
    index: true
  },
  
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  userEmail: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  
  userRole: {
    type: String,
    required: true
  },
  
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  ip: String,
  userAgent: String,
  
  // Flexible metadata
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  
  // 🔥 FIX: These should be strings, not objects
  sessionId: {
    type: String,
    default: null
  },
  
  transactionId: {
    type: String,
    default: null
  }
  
}, {
  timestamps: true
});

// Add indexes
logSchema.index({ action: 1, timestamp: -1 });
logSchema.index({ userId: 1, timestamp: -1 });
logSchema.index({ 'metadata.entityId': 1 });
logSchema.index({ 'metadata.itemId': 1 });

// Create the model
const Log = mongoose.models.Log || mongoose.model<ILog>('Log', logSchema);

export default Log;