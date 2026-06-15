import mongoose from 'mongoose';

// A single rule, e.g. { field: 'totalSpend', operator: 'gt', value: 5000 }
const ruleSchema = new mongoose.Schema(
  {
    field: {
      type: String,
      required: true,
      enum: [
        'totalSpend',
        'totalOrders',
        'lastPurchaseDate',
        'location.city',
        'category',
        'segment',
        'leadScore',
      ],
    },
    operator: {
      type: String,
      required: true,
      enum: ['gt', 'gte', 'lt', 'lte', 'eq', 'neq', 'in', 'before', 'after', 'olderThanDays'],
    },
    value: mongoose.Schema.Types.Mixed,
  },
  { _id: false }
);

// A group of rules combined with AND/OR, supports nested groups
const ruleGroupSchema = new mongoose.Schema(
  {
    condition: { type: String, enum: ['AND', 'OR'], default: 'AND' },
    rules: [ruleSchema],
    groups: [mongoose.Schema.Types.Mixed], // nested ruleGroups (recursive, stored as mixed)
  },
  { _id: false }
);

const segmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Segment name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    ruleGroup: {
      type: ruleGroupSchema,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    source: {
      type: String,
      enum: ['manual', 'ai-generated', 'ai-agent'],
      default: 'manual',
    },
    naturalLanguageQuery: {
      type: String,
      default: '',
    },
    audienceSize: {
      type: Number,
      default: 0,
    },
    lastEvaluatedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

const Segment = mongoose.model('Segment', segmentSchema);
export default Segment;
