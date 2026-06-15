import express from 'express';
import { sendMessage, getMessageLog, getMessageLogs } from '../controllers/sendController.js';
import { verifyApiKey } from '../middleware/auth.js';

const router = express.Router();

router.post('/send', verifyApiKey, sendMessage);
router.get('/logs', verifyApiKey, getMessageLogs);
router.get('/logs/:communicationId', verifyApiKey, getMessageLog);

export default router;
