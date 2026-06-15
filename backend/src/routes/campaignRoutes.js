import express from 'express';
import { body } from 'express-validator';
import {
  getCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  launchCampaign,
  pauseCampaign,
  getCampaignCommunications,
} from '../controllers/campaignController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(getCampaigns)
  .post(
    [
      body('name').notEmpty().withMessage('Campaign name is required'),
      body('segment').isMongoId().withMessage('Valid segment id is required'),
      body('channel').isIn(['Email', 'SMS', 'WhatsApp', 'Push']).withMessage('Invalid channel'),
      body('message').notEmpty().withMessage('Message is required'),
    ],
    validate,
    createCampaign
  );

router.route('/:id').get(getCampaignById).put(updateCampaign).delete(deleteCampaign);
router.post('/:id/launch', launchCampaign);
router.post('/:id/pause', pauseCampaign);
router.get('/:id/communications', getCampaignCommunications);

export default router;
