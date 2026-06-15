import mongoose from 'mongoose';

// Defines the valid lifecycle progression of a communication event
export const STATUS_ORDER = [
  'PENDING',
  'SENT',
  'DELIVERED',
  'OPENED',
  'READ',
  'CLICKED',
  'CONVERTED',
];

export const STATUS_RANK = STATUS_ORDER.reduce((acc, status, idx) => {
  acc[status] = idx;
  return acc;
}, {});

const eventLogSchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const communicationSchema = new mongoose.Schema(
  {
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    variant: {
      type: String,
      default: 'A',
    },
    channel: {
      type: String,
      enum: ['Email', 'SMS', 'WhatsApp', 'Push'],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'SENT', 'DELIVERED', 'FAILED', 'OPENED', 'READ', 'CLICKED', 'CONVERTED'],
      default: 'PENDING',
      index: true,
    },
    failureReason: {
      type: String,
      default: '',
    },
    vendorMessageId: {
      type: String,
      index: true,
    },
    events: [eventLogSchema],
    sentAt: Date,
    deliveredAt: Date,
    openedAt: Date,
    readAt: Date,
    clickedAt: Date,
    convertedAt: Date,
    revenueGenerated: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

communicationSchema.index({ campaign: 1, status: 1 });

const Communication = mongoose.model('Communication', communicationSchema);
export default Communication;
