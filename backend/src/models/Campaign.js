import mongoose from 'mongoose';

const campaignStatsSchema = new mongoose.Schema(
  {
    audienceSize: { type: Number, default: 0 },
    sent: { type: Number, default: 0 },
    delivered: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    opened: { type: Number, default: 0 },
    read: { type: Number, default: 0 },
    clicked: { type: Number, default: 0 },
    converted: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
  },
  { _id: false }
);

const abVariantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // e.g. "A" / "B"
    message: { type: String, required: true },
    weight: { type: Number, default: 50 }, // percentage of audience
    stats: { type: campaignStatsSchema, default: () => ({}) },
  },
  { _id: false }
);

const campaignSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Campaign name is required'],
      trim: true,
    },
    segment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Segment',
      required: true,
    },
    channel: {
      type: String,
      enum: ['Email', 'SMS', 'WhatsApp', 'Push'],
      required: true,
    },
    offer: {
      type: String,
      default: '',
    },
    objective: {
      type: String,
      default: '',
    },
    message: {
      type: String,
      required: [true, 'Campaign message is required'],
    },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'running', 'completed', 'failed', 'paused'],
      default: 'draft',
      index: true,
    },
    scheduledAt: {
      type: Date,
    },
    launchedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    isAbTest: {
      type: Boolean,
      default: false,
    },
    variants: [abVariantSchema],
    stats: {
      type: campaignStatsSchema,
      default: () => ({}),
    },
    aiGenerated: {
      type: Boolean,
      default: false,
    },
    aiReasoning: {
      type: String,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

campaignSchema.index({ status: 1, createdAt: -1 });

const Campaign = mongoose.model('Campaign', campaignSchema);
export default Campaign;
