// server/models/Inventory.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IComponent extends Document {
  model: string;
  description: string;
  quantity: number;
  location: string | number; // Can be either a string (like 'Box') or a number
  link: string;
  createdAt: Date;
  updatedAt: Date;
}

// 2. Create the Schema
const componentSchema = new Schema<IComponent>({
  model: {
    type: String,
    required: [true, 'Model name is required'],
    trim: true,
    index: true // Add index for faster searches
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative'],
    default: 0
  },
  location: {
    type: Schema.Types.Mixed, // Can be string or number
    required: [true, 'Location is required'],
    // You can add validation if needed
    validate: {
      validator: function(v: any) {
        return typeof v === 'string' || typeof v === 'number';
      },
      message: 'Location must be a string or number'
    }
  },
  link: {
    type: String,
    required: [true, 'Image link is required'],
    trim: true
  }
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt
});

// 3. Add indexes for better query performance
componentSchema.index({ model: 'text', description: 'text' }); // Text search index
componentSchema.index({ quantity: 1 }); // Index for sorting by quantity
componentSchema.index({ location: 1 }); // Index for filtering by location

// 4. Add any instance methods you might need
componentSchema.methods.toJSON = function() {
  const obj = this.toObject();
  // Convert _id to id for easier frontend handling
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;
  return obj;
}
const Component =
  mongoose.models.Component ||
  mongoose.model<IComponent>('Component',componentSchema, 'inventory');

export default Component;