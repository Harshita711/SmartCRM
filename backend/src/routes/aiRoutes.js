import express from 'express';
import { body } from 'express-validator';
import {
  buildAudienceFromText,
  generateMessage,
  generateCampaign,
  getOptimizationSuggestions,
  runAgent,
  listConversations,
  getConversation,
  deleteConversation,
  sendChatMessage,
  sendChatMessageSync,
} from '../controllers/aiController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.use(protect);

router.post('/audience', [body('query').notEmpty().withMessage('query is required')], validate, buildAudienceFromText);
router.post('/message', generateMessage);
router.post('/campaign-generator', [body('prompt').notEmpty().withMessage('prompt is required')], validate, generateCampaign);
router.get('/optimize/:campaignId', getOptimizationSuggestions);
router.post('/agent', [body('goal').notEmpty().withMessage('goal is required')], validate, runAgent);

// Conversational AI assistant
router.get('/chat/conversations', listConversations);
router.get('/chat/conversations/:id', getConversation);
router.delete('/chat/conversations/:id', deleteConversation);
router.post('/chat', [body('message').notEmpty().withMessage('message is required')], validate, sendChatMessage);
router.post('/chat/sync', [body('message').notEmpty().withMessage('message is required')], validate, sendChatMessageSync);

export default router;
