import asyncHandler from 'express-async-handler';
import Campaign from '../models/Campaign.js';
import Segment from '../models/Segment.js';
import Customer from '../models/Customer.js';
import Communication from '../models/Communication.js';
import { buildSegmentQuery } from '../services/segmentEngine.js';
import { dispatchToChannel } from '../services/channelClient.js';
import logger from '../config/logger.js';

const personalize = (message, customer) =>
  message.replace(/{{\s*name\s*}}/gi, customer.name?.split(' ')[0] || 'there');

// @desc    List campaigns
// @route   GET /api/campaigns
// @access  Private
export const getCampaigns = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  const query = {};
  if (status) query.status = status;

  const pageNum = Math.max(parseInt(page, 10), 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10), 1), 100);

  const [campaigns, total] = await Promise.all([
    Campaign.find(query)
      .populate('segment', 'name audienceSize')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Campaign.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: campaigns,
    pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
  });
});

// @desc    Get single campaign with stats
// @route   GET /api/campaigns/:id
// @access  Private
export const getCampaignById = asyncHandler(async (req, res) => {
  const campaign = await Campaign.findById(req.params.id).populate('segment');
  if (!campaign) {
    res.status(404);
    throw new Error('Campaign not found');
  }
  res.json({ success: true, data: campaign });
});

// @desc    Create a campaign (draft)
// @route   POST /api/campaigns
// @access  Private
export const createCampaign = asyncHandler(async (req, res) => {
  const {
    name,
    segment,
    channel,
    offer,
    objective,
    message,
    isAbTest,
    variants,
    aiGenerated,
    aiReasoning,
    scheduledAt,
  } = req.body;

  const segmentDoc = await Segment.findById(segment);
  if (!segmentDoc) {
    res.status(404);
    throw new Error('Segment not found');
  }

  const campaign = await Campaign.create({
    name,
    segment,
    channel,
    offer,
    objective,
    message,
    isAbTest: !!isAbTest,
    variants: isAbTest ? variants : [],
    aiGenerated: !!aiGenerated,
    aiReasoning: aiReasoning || '',
    status: scheduledAt ? 'scheduled' : 'draft',
    scheduledAt: scheduledAt || undefined,
    stats: { audienceSize: segmentDoc.audienceSize },
    createdBy: req.user?._id,
  });

  res.status(201).json({ success: true, data: campaign });
});

// @desc    Update a campaign (only while in draft/scheduled state)
// @route   PUT /api/campaigns/:id
// @access  Private
export const updateCampaign = asyncHandler(async (req, res) => {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) {
    res.status(404);
    throw new Error('Campaign not found');
  }

  if (!['draft', 'scheduled', 'paused'].includes(campaign.status)) {
    res.status(400);
    throw new Error(`Cannot edit a campaign with status '${campaign.status}'`);
  }

  const allowedFields = ['name', 'channel', 'offer', 'objective', 'message', 'isAbTest', 'variants', 'scheduledAt', 'status'];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) campaign[field] = req.body[field];
  });

  await campaign.save();
  res.json({ success: true, data: campaign });
});

// @desc    Delete a campaign
// @route   DELETE /api/campaigns/:id
// @access  Private
export const deleteCampaign = asyncHandler(async (req, res) => {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) {
    res.status(404);
    throw new Error('Campaign not found');
  }

  if (campaign.status === 'running') {
    res.status(400);
    throw new Error('Cannot delete a running campaign');
  }

  await Communication.deleteMany({ campaign: campaign._id });
  await campaign.deleteOne();

  res.json({ success: true, message: 'Campaign deleted' });
});

/**
 * Assigns an A/B variant to a customer based on configured weights, falling back to
 * variant "A" (or the plain message) when the campaign is not an A/B test.
 */
const assignVariant = (campaign, index) => {
  if (!campaign.isAbTest || !campaign.variants?.length) {
    return { variant: 'A', message: campaign.message };
  }

  const weights = campaign.variants.map((v) => v.weight || 0);
  const totalWeight = weights.reduce((a, b) => a + b, 0) || 100;
  const point = (index % 100) * (totalWeight / 100);

  let cumulative = 0;
  for (const v of campaign.variants) {
    cumulative += v.weight || 0;
    if (point <= cumulative) return { variant: v.name, message: v.message };
  }
  return { variant: campaign.variants[0].name, message: campaign.variants[0].message };
};

// @desc    Launch a campaign - resolves audience, creates communications, dispatches to channel service
// @route   POST /api/campaigns/:id/launch
// @access  Private
export const launchCampaign = asyncHandler(async (req, res) => {
  const campaign = await Campaign.findById(req.params.id).populate('segment');
  if (!campaign) {
    res.status(404);
    throw new Error('Campaign not found');
  }

  if (!['draft', 'scheduled', 'paused'].includes(campaign.status)) {
    res.status(400);
    throw new Error(`Campaign with status '${campaign.status}' cannot be launched`);
  }

  const query = buildSegmentQuery(campaign.segment.ruleGroup);
  const audience = await Customer.find(query);

  if (audience.length === 0) {
    res.status(400);
    throw new Error('Audience is empty - cannot launch campaign');
  }

  campaign.status = 'running';
  campaign.launchedAt = new Date();
  campaign.stats.audienceSize = audience.length;

  // Reset stats counters for a fresh launch
  ['sent', 'delivered', 'failed', 'opened', 'read', 'clicked', 'converted', 'revenue'].forEach((k) => {
    campaign.stats[k] = 0;
  });
  if (campaign.isAbTest) {
    campaign.variants.forEach((v) => {
      v.stats = { audienceSize: 0, sent: 0, delivered: 0, failed: 0, opened: 0, read: 0, clicked: 0, converted: 0, revenue: 0 };
    });
  }

  await campaign.save();

  // Build communication documents
  const communicationDocs = audience.map((customer, idx) => {
    const { variant, message } = assignVariant(campaign, idx);
    return {
      campaign: campaign._id,
      customer: customer._id,
      variant,
      channel: campaign.channel,
      message: personalize(message, customer),
      status: 'PENDING',
      events: [{ status: 'PENDING' }],
    };
  });

  const communications = await Communication.insertMany(communicationDocs);

  // Dispatch asynchronously (do not block response on every network call)
  res.json({
    success: true,
    message: `Campaign launched to ${audience.length} customers`,
    data: { campaign, audienceSize: audience.length },
  });

  // Fire-and-forget dispatch loop
  (async () => {
    let sentCount = 0;
    let failedCount = 0;
    const variantCounts = {};

    for (let i = 0; i < communications.length; i++) {
      const comm = communications[i];
      const customer = audience[i];

      try {
        const result = await dispatchToChannel({
          communicationId: comm._id.toString(),
          recipient: customer.email,
          channel: campaign.channel,
          message: comm.message,
          campaignId: campaign._id.toString(),
          customerId: customer._id.toString(),
        });

        if (result.success) {
          comm.status = 'SENT';
          comm.sentAt = new Date();
          comm.vendorMessageId = result.vendorMessageId;
          comm.events.push({ status: 'SENT' });
          sentCount += 1;
        } else {
          comm.status = 'FAILED';
          comm.failureReason = result.error || 'Dispatch failed';
          comm.events.push({ status: 'FAILED', meta: { reason: comm.failureReason } });
          failedCount += 1;
        }

        await comm.save();

        if (campaign.isAbTest) {
          variantCounts[comm.variant] = variantCounts[comm.variant] || { sent: 0, failed: 0, audienceSize: 0 };
          variantCounts[comm.variant].audienceSize += 1;
          if (result.success) variantCounts[comm.variant].sent += 1;
          else variantCounts[comm.variant].failed += 1;
        }
      } catch (err) {
        logger.error(`Dispatch loop error for communication ${comm._id}: ${err.message}`);
        comm.status = 'FAILED';
        comm.failureReason = err.message;
        await comm.save();
        failedCount += 1;
      }
    }

    campaign.stats.sent = sentCount;
    campaign.stats.failed = failedCount;

    if (campaign.isAbTest) {
      campaign.variants.forEach((v) => {
        const c = variantCounts[v.name] || { sent: 0, failed: 0, audienceSize: 0 };
        v.stats.audienceSize = c.audienceSize;
        v.stats.sent = c.sent;
        v.stats.failed = c.failed;
      });
    }

    await campaign.save();
    logger.info(`Campaign ${campaign._id} dispatch complete: ${sentCount} sent, ${failedCount} failed`);
  })().catch((err) => logger.error(`Campaign dispatch background task error: ${err.message}`));
});

// @desc    Pause a running/scheduled campaign
// @route   POST /api/campaigns/:id/pause
// @access  Private
export const pauseCampaign = asyncHandler(async (req, res) => {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) {
    res.status(404);
    throw new Error('Campaign not found');
  }

  if (!['running', 'scheduled'].includes(campaign.status)) {
    res.status(400);
    throw new Error(`Cannot pause a campaign with status '${campaign.status}'`);
  }

  campaign.status = 'paused';
  await campaign.save();
  res.json({ success: true, data: campaign });
});

// @desc    Get campaign communications (for funnel / drill-down)
// @route   GET /api/campaigns/:id/communications
// @access  Private
export const getCampaignCommunications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const query = { campaign: req.params.id };
  if (status) query.status = status;

  const pageNum = Math.max(parseInt(page, 10), 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10), 1), 100);

  const [comms, total] = await Promise.all([
    Communication.find(query)
      .populate('customer', 'name email')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Communication.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: comms,
    pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
  });
});
