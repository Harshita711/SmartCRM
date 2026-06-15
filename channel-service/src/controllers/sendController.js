import asyncHandler from 'express-async-handler';
import crypto from 'crypto';
import logger from '../config/logger.js';
import { simulateDelivery } from '../utils/deliverySimulator.js';
import MessageLog from '../models/MessageLog.js';

// @desc    Receive a message dispatch request and simulate provider delivery
// @route   POST /send
// @access  Private (shared API key)
export const sendMessage = asyncHandler(async (req, res) => {
  const { communicationId, recipient, channel, message, campaignId, customerId, callbackUrl } = req.body;

  if (!communicationId || !recipient || !channel || !message || !callbackUrl) {
    res.status(400);
    throw new Error('communicationId, recipient, channel, message and callbackUrl are required');
  }

  const vendorMessageId = `vnd_${crypto.randomBytes(8).toString('hex')}`;

  // Respond immediately with the assigned vendor message id (as a real provider would
  // for an async send), then simulate the lifecycle in the background.
  res.status(202).json({ success: true, vendorMessageId, status: 'queued' });

  simulateDelivery({ communicationId, recipient, channel, message, campaignId, customerId, callbackUrl, vendorMessageId }).catch(
    (err) => logger.error(`Simulation error for ${communicationId}: ${err.message}`)
  );
});

// @desc    Get a message log by communication id (debugging)
// @route   GET /logs/:communicationId
// @access  Private
export const getMessageLog = asyncHandler(async (req, res) => {
  const log = await MessageLog.findOne({ communicationId: req.params.communicationId });
  if (!log) {
    res.status(404);
    throw new Error('Message log not found');
  }
  res.json({ success: true, data: log });
});

// @desc    List recent message logs (debugging dashboard)
// @route   GET /logs
// @access  Private
export const getMessageLogs = asyncHandler(async (req, res) => {
  const { limit = 50 } = req.query;
  const logs = await MessageLog.find().sort({ createdAt: -1 }).limit(Math.min(Number(limit), 200));
  res.json({ success: true, data: logs });
});
