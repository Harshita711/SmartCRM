import asyncHandler from 'express-async-handler';
import Communication, { STATUS_RANK } from '../models/Communication.js';
import Campaign from '../models/Campaign.js';
import logger from '../config/logger.js';

const STAT_FIELD_BY_STATUS = {
  DELIVERED: 'delivered',
  FAILED: 'failed',
  OPENED: 'opened',
  READ: 'read',
  CLICKED: 'clicked',
  CONVERTED: 'converted',
};

const TIMESTAMP_FIELD_BY_STATUS = {
  SENT: 'sentAt',
  DELIVERED: 'deliveredAt',
  OPENED: 'openedAt',
  READ: 'readAt',
  CLICKED: 'clickedAt',
  CONVERTED: 'convertedAt',
};

// @desc    Receive a delivery lifecycle event from the Channel Service
// @route   POST /api/communications/receipt
// @access  Public (secured via shared API key header)
export const receiveReceipt = asyncHandler(async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.CHANNEL_SERVICE_API_KEY) {
    res.status(401);
    throw new Error('Invalid channel service API key');
  }

  const { communicationId, status, vendorMessageId, timestamp, meta, revenue } = req.body;

  if (!communicationId || !status) {
    res.status(400);
    throw new Error('communicationId and status are required');
  }

  const communication = await Communication.findById(communicationId);
  if (!communication) {
    res.status(404);
    throw new Error('Communication not found');
  }

  // --- Event ordering protection -------------------------------------
  // Out-of-order or duplicate webhooks are common with async channel providers.
  // We only accept transitions that move the lifecycle forward (or FAILED, which
  // is terminal and can occur from any non-terminal state).
  const currentRank = STATUS_RANK[communication.status] ?? -1;
  const incomingRank = STATUS_RANK[status] ?? -1;

  const isTerminal = ['FAILED', 'CONVERTED'].includes(communication.status);
  const isDuplicateOrStale = status !== 'FAILED' && incomingRank <= currentRank;

  if (isTerminal || isDuplicateOrStale) {
    logger.warn(
      `Ignoring out-of-order/duplicate receipt for ${communicationId}: current=${communication.status} incoming=${status}`
    );
    return res.json({ success: true, message: 'Event ignored (out of order or duplicate)', ignored: true });
  }

  const previousStatus = communication.status;
  communication.status = status;
  communication.events.push({ status, timestamp: timestamp ? new Date(timestamp) : new Date(), meta });

  if (vendorMessageId) communication.vendorMessageId = vendorMessageId;
  if (status === 'FAILED' && meta?.reason) communication.failureReason = meta.reason;
  if (status === 'CONVERTED' && revenue) communication.revenueGenerated = revenue;

  const tsField = TIMESTAMP_FIELD_BY_STATUS[status];
  if (tsField) communication[tsField] = timestamp ? new Date(timestamp) : new Date();

  await communication.save();

  // --- Update campaign aggregate stats --------------------------------
  const campaign = await Campaign.findById(communication.campaign);
  if (campaign) {
    const statField = STAT_FIELD_BY_STATUS[status];
    if (statField) {
      campaign.stats[statField] = (campaign.stats[statField] || 0) + 1;
      if (status === 'CONVERTED' && revenue) {
        campaign.stats.revenue = (campaign.stats.revenue || 0) + Number(revenue);
      }

      if (campaign.isAbTest && communication.variant) {
        const variant = campaign.variants.find((v) => v.name === communication.variant);
        if (variant) {
          variant.stats[statField] = (variant.stats[statField] || 0) + 1;
          if (status === 'CONVERTED' && revenue) {
            variant.stats.revenue = (variant.stats.revenue || 0) + Number(revenue);
          }
        }
      }
    }

    // Mark campaign completed once all sent communications have reached a terminal state
    const totalSent = campaign.stats.sent || 0;
    const terminalCount =
      (campaign.stats.delivered || 0) +
      (campaign.stats.failed || 0) -
      (campaign.stats.delivered ? 0 : 0); // delivered communications may continue progressing; completion check below is conservative

    if (campaign.status === 'running' && totalSent > 0) {
      const pendingOrSent = await Communication.countDocuments({
        campaign: campaign._id,
        status: { $in: ['PENDING', 'SENT'] },
      });
      if (pendingOrSent === 0) {
        campaign.status = 'completed';
        campaign.completedAt = new Date();
      }
    }

    await campaign.save();
  }

  logger.info(`Receipt processed: ${communicationId} ${previousStatus} -> ${status}`);
  res.json({ success: true, message: 'Receipt processed' });
});

// @desc    Get a single communication by id (debugging / drill-down)
// @route   GET /api/communications/:id
// @access  Private
export const getCommunicationById = asyncHandler(async (req, res) => {
  const communication = await Communication.findById(req.params.id)
    .populate('customer', 'name email')
    .populate('campaign', 'name channel');

  if (!communication) {
    res.status(404);
    throw new Error('Communication not found');
  }

  res.json({ success: true, data: communication });
});
