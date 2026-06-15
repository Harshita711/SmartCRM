import mongoose from 'mongoose';

// Independent log of every message processed by the channel service,
// useful for debugging delivery simulation and retry behavior.
const messageLogSchema = new mongoose.Schema(
  {
    communicationId: { type: String, required: true, index: true },
    campaignId: { type: String },
    customerId: { type: String },
    recipient: { type: String, required: true },
    channel: { type: String, required: true },
    message: { type: String, required: true },
    vendorMessageId: { type: String, index: true },
    statusHistory: [
      {
        status: { type: String },
        timestamp: { type: Date, default: Date.now },
        attempt: { type: Number, default: 1 },
        meta: { type: mongoose.Schema.Types.Mixed },
      },
    ],
    finalStatus: { type: String },
    callbackAttempts: { type: Number, default: 0 },
    callbackSucceeded: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const MessageLog = mongoose.model('MessageLog', messageLogSchema);
export default MessageLog;
