import axios from 'axios';
import logger from '../config/logger.js';
import MessageLog from '../models/MessageLog.js';

const MIN_DELAY = Number(process.env.MIN_DELAY_MS) || 500;
const MAX_DELAY = Number(process.env.MAX_DELAY_MS) || 4000;
const FAILURE_RATE = Number(process.env.FAILURE_RATE) || 0.1;
const MAX_RETRIES = Number(process.env.MAX_RETRIES) || 3;
const CHANNEL_SERVICE_API_KEY = process.env.CHANNEL_SERVICE_API_KEY || 'shared_secret_between_services';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const randomDelay = () => Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY)) + MIN_DELAY;

/**
 * Sends a delivery receipt event to the CRM backend, with retry on failure.
 * Includes a small amount of jitter so retries don't hammer the CRM in lockstep.
 */
const sendReceipt = async (callbackUrl, payload, log) => {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await axios.post(callbackUrl, payload, {
        headers: { 'x-api-key': CHANNEL_SERVICE_API_KEY },
        timeout: 5000,
      });

      if (log) {
        log.callbackAttempts = attempt;
        log.callbackSucceeded = true;
        await log.save().catch(() => {});
      }
      return true;
    } catch (error) {
      logger.warn(
        `Receipt callback failed (attempt ${attempt}/${MAX_RETRIES}) for ${payload.communicationId} -> ${payload.status}: ${error.message}`
      );
      if (attempt < MAX_RETRIES) {
        await sleep(300 * attempt); // simple backoff
      }
    }
  }

  if (log) {
    log.callbackAttempts = MAX_RETRIES;
    log.callbackSucceeded = false;
    await log.save().catch(() => {});
  }

  logger.error(`Receipt callback permanently failed for ${payload.communicationId} -> ${payload.status}`);
  return false;
};

/**
 * Runs the full simulated lifecycle for a single message, asynchronously.
 * Emits SENT, then either DELIVERED or FAILED, then with decreasing probability
 * OPENED -> READ -> CLICKED -> CONVERTED, each with randomized delays.
 *
 * Event ordering protection: each stage is awaited sequentially and the callback
 * is only fired for the next stage after the previous one's network call resolves,
 * so the CRM always receives events in lifecycle order for a given message.
 */
export const simulateDelivery = async ({ communicationId, recipient, channel, message, campaignId, customerId, callbackUrl, vendorMessageId }) => {
  let log = null;
  try {
    log = await MessageLog.create({
      communicationId,
      campaignId,
      customerId,
      recipient,
      channel,
      message,
      vendorMessageId,
      statusHistory: [{ status: 'PENDING' }],
    });
  } catch (err) {
    logger.warn(`Could not persist message log (DB may be unavailable): ${err.message}`);
  }

  const basePayload = { communicationId, vendorMessageId };

  // --- Stage 1: SENT -> DELIVERED or FAILED -----------------------------
  await sleep(randomDelay());

  const willFail = Math.random() < FAILURE_RATE;
  const deliveryStatus = willFail ? 'FAILED' : 'DELIVERED';
  const failureReasons = ['Invalid recipient address', 'Carrier rejected message', 'Recipient inbox full', 'Network timeout'];

  if (log) {
    log.statusHistory.push({ status: 'SENT' });
    log.statusHistory.push({
      status: deliveryStatus,
      meta: willFail ? { reason: failureReasons[Math.floor(Math.random() * failureReasons.length)] } : {},
    });
    log.finalStatus = deliveryStatus;
    await log.save().catch(() => {});
  }

  const deliveryPayload = { ...basePayload, status: deliveryStatus, timestamp: new Date().toISOString() };
  if (willFail) {
    deliveryPayload.meta = { reason: log?.statusHistory?.at(-1)?.meta?.reason || 'Delivery failed' };
  }

  await sendReceipt(callbackUrl, deliveryPayload, log);

  if (willFail) return; // terminal state - no further engagement events

  // --- Stage 2: OPENED (probability decreases funnel-style) ---------------
  if (Math.random() > 0.25) {
    await sleep(randomDelay());
    if (log) {
      log.statusHistory.push({ status: 'OPENED' });
      log.finalStatus = 'OPENED';
      await log.save().catch(() => {});
    }
    await sendReceipt(callbackUrl, { ...basePayload, status: 'OPENED', timestamp: new Date().toISOString() }, log);

    // --- Stage 3: READ ----------------------------------------------------
    if (Math.random() > 0.2) {
      await sleep(randomDelay());
      if (log) {
        log.statusHistory.push({ status: 'READ' });
        log.finalStatus = 'READ';
        await log.save().catch(() => {});
      }
      await sendReceipt(callbackUrl, { ...basePayload, status: 'READ', timestamp: new Date().toISOString() }, log);

      // --- Stage 4: CLICKED ------------------------------------------------
      if (Math.random() > 0.45) {
        await sleep(randomDelay());
        if (log) {
          log.statusHistory.push({ status: 'CLICKED' });
          log.finalStatus = 'CLICKED';
          await log.save().catch(() => {});
        }
        await sendReceipt(callbackUrl, { ...basePayload, status: 'CLICKED', timestamp: new Date().toISOString() }, log);

        // --- Stage 5: CONVERTED ------------------------------------------
        if (Math.random() > 0.55) {
          await sleep(randomDelay());
          const revenue = Math.floor(Math.random() * 2500) + 199;
          if (log) {
            log.statusHistory.push({ status: 'CONVERTED', meta: { revenue } });
            log.finalStatus = 'CONVERTED';
            await log.save().catch(() => {});
          }
          await sendReceipt(
            callbackUrl,
            { ...basePayload, status: 'CONVERTED', timestamp: new Date().toISOString(), revenue },
            log
          );
        }
      }
    }
  }
};
