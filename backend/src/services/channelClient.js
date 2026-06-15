import axios from 'axios';
import logger from '../config/logger.js';

const CHANNEL_SERVICE_URL = process.env.CHANNEL_SERVICE_URL || 'http://localhost:6000';
const CHANNEL_SERVICE_API_KEY = process.env.CHANNEL_SERVICE_API_KEY || 'shared_secret_between_services';
const CRM_BASE_URL = process.env.CRM_BASE_URL || 'http://localhost:5000';

const client = axios.create({
  baseURL: CHANNEL_SERVICE_URL,
  timeout: 8000,
  headers: { 'x-api-key': CHANNEL_SERVICE_API_KEY },
});

/**
 * Dispatches a single message to the Channel Service for delivery simulation.
 * Returns the vendor message id assigned by the channel service.
 */
export const dispatchToChannel = async ({ communicationId, recipient, channel, message, campaignId, customerId }) => {
  try {
    const { data } = await client.post('/send', {
      communicationId,
      recipient,
      channel,
      message,
      campaignId,
      customerId,
      callbackUrl: `${CRM_BASE_URL}/api/communications/receipt`,
    });
    return { success: true, vendorMessageId: data.vendorMessageId };
  } catch (error) {
    logger.error(`Channel dispatch failed for ${communicationId}: ${error.message}`);
    return { success: false, error: error.message };
  }
};

export default { dispatchToChannel };
