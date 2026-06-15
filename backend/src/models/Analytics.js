import mongoose from 'mongoose';

// Daily snapshot used for trend charts (audience growth, delivery performance, etc.)
const analyticsSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['daily-summary', 'campaign-summary'],
      default: 'daily-summary',
      index: true,
    },
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
    },
    metrics: {
      totalCustomers: { type: Number, default: 0 },
      newCustomers: { type: Number, default: 0 },
      totalOrders: { type: Number, default: 0 },
      revenue: { type: Number, default: 0 },
      messagesSent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      opened: { type: Number, default: 0 },
      read: { type: Number, default: 0 },
      clicked: { type: Number, default: 0 },
      converted: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

analyticsSchema.index({ date: 1, type: 1, campaign: 1 }, { unique: true, partialFilterExpression: { type: 'campaign-summary' } });

const Analytics = mongoose.model('Analytics', analyticsSchema);
export default Analytics;
