import express from 'express';
import {
  getDashboardSummary,
  getRecentCampaigns,
  getRecentActivity,
  getAudienceGrowth,
  getDeliveryTrend,
  getChannelPerformance,
  getAnalyticsInsights,
} from '../controllers/analyticsController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/dashboard', getDashboardSummary);
router.get('/recent-campaigns', getRecentCampaigns);
router.get('/recent-activity', getRecentActivity);
router.get('/audience-growth', getAudienceGrowth);
router.get('/delivery-trend', getDeliveryTrend);
router.get('/channel-performance', getChannelPerformance);
router.get('/insights', getAnalyticsInsights);

export default router;
