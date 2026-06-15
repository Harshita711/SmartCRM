import express from 'express';
import { receiveReceipt, getCommunicationById } from '../controllers/communicationController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public (secured via shared API key) - called by the Channel Service
router.post('/receipt', receiveReceipt);

// Private - debugging/drill-down
router.get('/:id', protect, getCommunicationById);

export default router;
