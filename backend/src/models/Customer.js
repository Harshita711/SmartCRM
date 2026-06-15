import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
    },
    location: {
      city: { type: String, required: true, index: true },
      state: { type: String },
      country: { type: String, default: 'India' },
    },
    category: {
      type: String,
      enum: ['Fashion', 'Coffee', 'Beauty', 'Retail', 'General'],
      default: 'General',
      index: true,
    },
    totalSpend: {
      type: Number,
      default: 0,
      index: true,
    },
    totalOrders: {
      type: Number,
      default: 0,
      index: true,
    },
    lastPurchaseDate: {
      type: Date,
      index: true,
    },
    segment: {
      type: String,
      enum: ['New', 'Active', 'Loyal', 'At Risk', 'Inactive', 'Premium', 'Churned'],
      default: 'New',
      index: true,
    },
    leadScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    tags: [{ type: String }],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

customerSchema.index({ name: 'text', email: 'text' });
customerSchema.index({ totalSpend: -1, totalOrders: -1 });
customerSchema.index({ 'location.city': 1, category: 1 });

const Customer = mongoose.model('Customer', customerSchema);
export default Customer;
