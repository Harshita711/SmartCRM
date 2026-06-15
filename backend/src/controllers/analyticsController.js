import asyncHandler from 'express-async-handler';
import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import Campaign from '../models/Campaign.js';
import Communication from '../models/Communication.js';
import { generateAnalyticsInsights } from '../services/geminiService.js';

const rate = (numerator, denominator) => (denominator > 0 ? Number(((numerator / denominator) * 100).toFixed(2)) : 0);

// @desc    Dashboard summary metrics
// @route   GET /api/analytics/dashboard
// @access  Private
export const getDashboardSummary = asyncHandler(async (req, res) => {
  const [totalCustomers, totalOrders, activeCampaigns, commStats, revenueAgg] = await Promise.all([
    Customer.countDocuments(),
    Order.countDocuments(),
    Campaign.countDocuments({ status: { $in: ['running', 'scheduled'] } }),
    Communication.aggregate([
      {
        $group: {
          _id: null,
          sent: { $sum: { $cond: [{ $in: ['$status', ['SENT', 'DELIVERED', 'OPENED', 'READ', 'CLICKED', 'CONVERTED', 'FAILED']] }, 1, 0] } },
          delivered: { $sum: { $cond: [{ $in: ['$status', ['DELIVERED', 'OPENED', 'READ', 'CLICKED', 'CONVERTED']] }, 1, 0] } },
          opened: { $sum: { $cond: [{ $in: ['$status', ['OPENED', 'READ', 'CLICKED', 'CONVERTED']] }, 1, 0] } },
          clicked: { $sum: { $cond: [{ $in: ['$status', ['CLICKED', 'CONVERTED']] }, 1, 0] } },
          converted: { $sum: { $cond: [{ $eq: ['$status', 'CONVERTED'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] } },
        },
      },
    ]),
    Order.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
  ]);

  const stats = commStats[0] || { sent: 0, delivered: 0, opened: 0, clicked: 0, converted: 0, failed: 0 };
  const totalRevenue = revenueAgg[0]?.total || 0;

  res.json({
    success: true,
    data: {
      totalCustomers,
      totalOrders,
      activeCampaigns,
      messagesSent: stats.sent,
      deliveryRate: rate(stats.delivered, stats.sent),
      openRate: rate(stats.opened, stats.delivered),
      clickRate: rate(stats.clicked, stats.opened),
      conversionRate: rate(stats.converted, stats.sent),
      totalRevenue,
    },
  });
});

// @desc    Recent campaigns for dashboard
// @route   GET /api/analytics/recent-campaigns
// @access  Private
export const getRecentCampaigns = asyncHandler(async (req, res) => {
  const campaigns = await Campaign.find()
    .populate('segment', 'name')
    .sort({ createdAt: -1 })
    .limit(5)
    .select('name channel status stats createdAt');

  res.json({ success: true, data: campaigns });
});

// @desc    Recent activity feed (recent communications + campaign events)
// @route   GET /api/analytics/recent-activity
// @access  Private
export const getRecentActivity = asyncHandler(async (req, res) => {
  const recentComms = await Communication.find()
    .sort({ updatedAt: -1 })
    .limit(10)
    .populate('customer', 'name')
    .populate('campaign', 'name channel');

  const activity = recentComms.map((c) => ({
    id: c._id,
    type: 'communication',
    description: `${c.customer?.name || 'Customer'} - ${c.campaign?.name || 'Campaign'} (${c.channel}) -> ${c.status}`,
    status: c.status,
    timestamp: c.updatedAt,
  }));

  res.json({ success: true, data: activity });
});

// @desc    Audience growth trend (last 30 days, based on customer createdAt)
// @route   GET /api/analytics/audience-growth
// @access  Private
export const getAudienceGrowth = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days, 10) || 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const growth = await Customer.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        newCustomers: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json({ success: true, data: growth.map((g) => ({ date: g._id, newCustomers: g.newCustomers })) });
});

// @desc    Delivery analytics trend (last N days)
// @route   GET /api/analytics/delivery-trend
// @access  Private
export const getDeliveryTrend = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days, 10) || 14;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const trend = await Communication.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        sent: { $sum: 1 },
        delivered: { $sum: { $cond: [{ $in: ['$status', ['DELIVERED', 'OPENED', 'READ', 'CLICKED', 'CONVERTED']] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] } },
        opened: { $sum: { $cond: [{ $in: ['$status', ['OPENED', 'READ', 'CLICKED', 'CONVERTED']] }, 1, 0] } },
        clicked: { $sum: { $cond: [{ $in: ['$status', ['CLICKED', 'CONVERTED']] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json({
    success: true,
    data: trend.map((t) => ({ date: t._id, ...t, _id: undefined })),
  });
});

// @desc    Channel performance comparison
// @route   GET /api/analytics/channel-performance
// @access  Private
export const getChannelPerformance = asyncHandler(async (req, res) => {
  const data = await Communication.aggregate([
    {
      $group: {
        _id: '$channel',
        sent: { $sum: 1 },
        delivered: { $sum: { $cond: [{ $in: ['$status', ['DELIVERED', 'OPENED', 'READ', 'CLICKED', 'CONVERTED']] }, 1, 0] } },
        opened: { $sum: { $cond: [{ $in: ['$status', ['OPENED', 'READ', 'CLICKED', 'CONVERTED']] }, 1, 0] } },
        clicked: { $sum: { $cond: [{ $in: ['$status', ['CLICKED', 'CONVERTED']] }, 1, 0] } },
        converted: { $sum: { $cond: [{ $eq: ['$status', 'CONVERTED'] }, 1, 0] } },
        revenue: { $sum: '$revenueGenerated' },
      },
    },
  ]);

  const result = data.map((d) => ({
    channel: d._id,
    sent: d.sent,
    delivered: d.delivered,
    deliveryRate: rate(d.delivered, d.sent) / 100,
    openRate: rate(d.opened, d.delivered) / 100,
    clickRate: rate(d.clicked, d.opened) / 100,
    conversionRate: rate(d.converted, d.sent) / 100,
    revenue: d.revenue,
  }));

  res.json({ success: true, data: result });
});

// @desc    AI-generated analytics insights based on overall performance
// @route   GET /api/analytics/insights
// @access  Private
export const getAnalyticsInsights = asyncHandler(async (req, res) => {
  const channelPerformance = await Communication.aggregate([
    {
      $group: {
        _id: '$channel',
        sent: { $sum: 1 },
        delivered: { $sum: { $cond: [{ $in: ['$status', ['DELIVERED', 'OPENED', 'READ', 'CLICKED', 'CONVERTED']] }, 1, 0] } },
        opened: { $sum: { $cond: [{ $in: ['$status', ['OPENED', 'READ', 'CLICKED', 'CONVERTED']] }, 1, 0] } },
        clicked: { $sum: { $cond: [{ $in: ['$status', ['CLICKED', 'CONVERTED']] }, 1, 0] } },
        converted: { $sum: { $cond: [{ $eq: ['$status', 'CONVERTED'] }, 1, 0] } },
      },
    },
  ]);

  const formatted = channelPerformance.map((d) => ({
    channel: d._id,
    sent: d.sent,
    deliveryRate: rate(d.delivered, d.sent) / 100,
    openRate: rate(d.opened, d.delivered) / 100,
    clickRate: rate(d.clicked, d.opened) / 100,
    conversionRate: rate(d.converted, d.sent) / 100,
  }));

  const insights = await generateAnalyticsInsights({ channelPerformance: formatted });

  res.json({ success: true, data: { insights, channelPerformance: formatted } });
});
