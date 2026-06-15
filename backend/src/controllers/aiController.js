import asyncHandler from 'express-async-handler';
import Customer from '../models/Customer.js';
import Campaign from '../models/Campaign.js';
import Conversation from '../models/Conversation.js';
import logger from '../config/logger.js';
import { buildSegmentQuery, validateRuleGroup } from '../services/segmentEngine.js';
import {
  generateSegmentFromText,
  generateCampaignMessage,
  generateOptimizationSuggestions,
  generateCampaignDraft,
  runMarketingAgent,
  generateChatReply,
  streamChatReply,
  fallbackChatReply,
} from '../services/geminiService.js';

// @desc    Convert natural language into segment rule group + preview audience size
// @route   POST /api/ai/audience
// @access  Private
export const buildAudienceFromText = asyncHandler(async (req, res) => {
  const { query } = req.body;
  if (!query || !query.trim()) {
    res.status(400);
    throw new Error('A natural language query is required');
  }

  const result = await generateSegmentFromText(query);
  validateRuleGroup(result.ruleGroup);

  const mongoQuery = buildSegmentQuery(result.ruleGroup);
  const audienceSize = await Customer.countDocuments(mongoQuery);
  const sample = await Customer.find(mongoQuery)
    .limit(5)
    .select('name email segment totalSpend totalOrders location category');

  res.json({
    success: true,
    data: {
      name: result.name,
      description: result.description,
      ruleGroup: result.ruleGroup,
      audienceSize,
      sample,
      naturalLanguageQuery: query,
    },
  });
});

// @desc    Generate a campaign message via AI
// @route   POST /api/ai/message
// @access  Private
export const generateMessage = asyncHandler(async (req, res) => {
  const { objective, offer, channel = 'Email', audienceDescription } = req.body;

  const message = await generateCampaignMessage({ objective, offer, channel, audienceDescription });
  res.json({ success: true, data: { message } });
});

// @desc    Full AI campaign draft generation from a single prompt
// @route   POST /api/ai/campaign-generator
// @access  Private
export const generateCampaign = asyncHandler(async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || !prompt.trim()) {
    res.status(400);
    throw new Error('A campaign prompt is required');
  }

  const [cities, categories] = await Promise.all([
    Customer.distinct('location.city'),
    Customer.distinct('category'),
  ]);

  const draft = await generateCampaignDraft(prompt, cities, categories);
  validateRuleGroup(draft.segment.ruleGroup);

  const mongoQuery = buildSegmentQuery(draft.segment.ruleGroup);
  const audienceSize = await Customer.countDocuments(mongoQuery);

  res.json({
    success: true,
    data: {
      ...draft,
      segment: { ...draft.segment, audienceSize },
      prompt,
    },
  });
});

// @desc    Get AI optimization suggestions for a campaign
// @route   GET /api/ai/optimize/:campaignId
// @access  Private
export const getOptimizationSuggestions = asyncHandler(async (req, res) => {
  const campaign = await Campaign.findById(req.params.campaignId);
  if (!campaign) {
    res.status(404);
    throw new Error('Campaign not found');
  }

  const recommendations = await generateOptimizationSuggestions(campaign.stats.toObject());
  res.json({ success: true, data: { recommendations } });
});

// @desc    AI Marketing Agent - end-to-end plan from a business goal
// @route   POST /api/ai/agent
// @access  Private
export const runAgent = asyncHandler(async (req, res) => {
  const { goal } = req.body;
  if (!goal || !goal.trim()) {
    res.status(400);
    throw new Error('A business goal is required');
  }

  const [totalCustomers, segmentBreakdown, categoryBreakdown, avgSpendAgg] = await Promise.all([
    Customer.countDocuments(),
    Customer.aggregate([{ $group: { _id: '$segment', count: { $sum: 1 } } }]),
    Customer.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
    Customer.aggregate([{ $group: { _id: null, avgSpend: { $avg: '$totalSpend' }, avgOrders: { $avg: '$totalOrders' } } }]),
  ]);

  const customerStats = {
    totalCustomers,
    segments: Object.fromEntries(segmentBreakdown.map((s) => [s._id, s.count])),
    categories: Object.fromEntries(categoryBreakdown.map((c) => [c._id, c.count])),
    avgSpend: Math.round(avgSpendAgg[0]?.avgSpend || 0),
    avgOrders: Number((avgSpendAgg[0]?.avgOrders || 0).toFixed(1)),
  };

  const plan = await runMarketingAgent(goal, customerStats);
  validateRuleGroup(plan.recommendedAudience.ruleGroup);

  const mongoQuery = buildSegmentQuery(plan.recommendedAudience.ruleGroup);
  const audienceSize = await Customer.countDocuments(mongoQuery);

  res.json({
    success: true,
    data: {
      ...plan,
      recommendedAudience: { ...plan.recommendedAudience, audienceSize },
      customerStats,
      goal,
    },
  });
});

// ---------------------------------------------------------------------
// Conversational AI Assistant (chat) - persistent, context-aware
// ---------------------------------------------------------------------

const MAX_HISTORY_MESSAGES = 30; // cap how much history we send to the model

const deriveTitle = (firstMessage = '') => {
  const trimmed = firstMessage.trim().replace(/\s+/g, ' ');
  if (!trimmed) return 'New conversation';
  return trimmed.length > 48 ? `${trimmed.slice(0, 48)}...` : trimmed;
};

// @desc    List all conversations for the current user (sidebar history)
// @route   GET /api/ai/chat/conversations
// @access  Private
export const listConversations = asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({ user: req.user._id })
    .sort({ lastMessageAt: -1 })
    .select('title lastMessageAt createdAt');

  res.json({
    success: true,
    data: conversations.map((c) => ({
      id: c._id,
      title: c.title,
      lastMessageAt: c.lastMessageAt,
      createdAt: c.createdAt,
    })),
  });
});

// @desc    Get a single conversation with full message history
// @route   GET /api/ai/chat/conversations/:id
// @access  Private
export const getConversation = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findOne({ _id: req.params.id, user: req.user._id });
  if (!conversation) {
    res.status(404);
    throw new Error('Conversation not found');
  }

  res.json({
    success: true,
    data: {
      id: conversation._id,
      title: conversation.title,
      messages: conversation.messages,
    },
  });
});

// @desc    Delete a conversation
// @route   DELETE /api/ai/chat/conversations/:id
// @access  Private
export const deleteConversation = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!conversation) {
    res.status(404);
    throw new Error('Conversation not found');
  }
  res.json({ success: true, data: { id: req.params.id } });
});

// @desc    Send a chat message (streaming via SSE). Creates a conversation if needed,
//          stores both the user message and the AI reply, and always uses full
//          conversation history for context.
// @route   POST /api/ai/chat
// @access  Private
export const sendChatMessage = asyncHandler(async (req, res) => {
  const { message, conversationId } = req.body;

  if (!message || !message.trim()) {
    res.status(400);
    throw new Error('A message is required');
  }

  let conversation;
  if (conversationId) {
    conversation = await Conversation.findOne({ _id: conversationId, user: req.user._id });
    if (!conversation) {
      res.status(404);
      throw new Error('Conversation not found');
    }
  } else {
    conversation = new Conversation({ user: req.user._id, title: deriveTitle(message), messages: [] });
  }

  const userMessage = { role: 'user', content: message.trim(), timestamp: new Date() };
  conversation.messages.push(userMessage);

  // Trim history sent to the model (keep it bounded), but persist full history in DB
  const historyForModel = conversation.messages
    .slice(0, -1) // exclude the new message itself, it's passed separately
    .slice(-MAX_HISTORY_MESSAGES);

  // --- Streaming via Server-Sent Events ---
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const send = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Send conversation id immediately so the client can track it (esp. for new conversations)
  send('meta', { conversationId: conversation._id, title: conversation.title });

  let fullReply = '';
  let usedFallback = false;
  let toolEvents = [];

  try {
    const result = await streamChatReply(
      historyForModel,
      userMessage.content,
      (chunk) => {
        send('chunk', { text: chunk });
      },
      (toolEvent) => {
        send('tool_result', toolEvent);
      },
      (toolCall) => {
        send('tool_call', toolCall);
      }
    );
    fullReply = result.text;
    toolEvents = result.toolEvents || [];
    if (!fullReply || !fullReply.trim()) {
      throw new Error('Empty response from model');
    }
  } catch (error) {
    logger.error(`sendChatMessage: Gemini failed, using fallback: ${error.message}`);
    usedFallback = true;
    fullReply = fallbackChatReply(historyForModel, userMessage.content);
    // Simulate a small stream so the UI typing indicator/markdown rendering works consistently
    send('chunk', { text: fullReply });
  }

  // Persist any intermediate tool-call / tool-response turns so the model retains
  // memory of what it already did/found in this conversation, and so the UI can
  // re-render the result cards if the conversation is reloaded.
  toolEvents.forEach((evt) => {
    conversation.messages.push({
      role: 'assistant',
      content: '',
      toolCalls: evt.calls,
      timestamp: new Date(),
    });
    conversation.messages.push({
      role: 'tool',
      content: '',
      toolResults: evt.results,
      cards: evt.cards,
      timestamp: new Date(),
    });
  });

  const allCards = toolEvents.flatMap((e) => e.cards || []);
  const assistantMessage = { role: 'assistant', content: fullReply, timestamp: new Date(), cards: allCards.length ? allCards : undefined };
  conversation.messages.push(assistantMessage);
  conversation.lastMessageAt = new Date();
  if (conversation.messages.filter((m) => m.role === 'user').length === 1) {
    conversation.title = deriveTitle(message);
  }
  await conversation.save();

  send('done', {
    conversationId: conversation._id,
    title: conversation.title,
    usedFallback,
    message: assistantMessage,
  });
  res.end();
});

// @desc    Non-streaming variant of chat (used as a fallback for clients that can't
//          consume SSE, e.g. some mobile webviews).
// @route   POST /api/ai/chat/sync
// @access  Private
export const sendChatMessageSync = asyncHandler(async (req, res) => {
  const { message, conversationId } = req.body;

  if (!message || !message.trim()) {
    res.status(400);
    throw new Error('A message is required');
  }

  let conversation;
  if (conversationId) {
    conversation = await Conversation.findOne({ _id: conversationId, user: req.user._id });
    if (!conversation) {
      res.status(404);
      throw new Error('Conversation not found');
    }
  } else {
    conversation = new Conversation({ user: req.user._id, title: deriveTitle(message), messages: [] });
  }

  const userMessage = { role: 'user', content: message.trim(), timestamp: new Date() };
  conversation.messages.push(userMessage);

  const historyForModel = conversation.messages.slice(0, -1).slice(-MAX_HISTORY_MESSAGES);

  let fullReply;
  let usedFallback = false;
  let toolEvents = [];
  try {
    const result = await generateChatReply(historyForModel, userMessage.content);
    fullReply = result.text;
    toolEvents = result.toolEvents || [];
    if (!fullReply || !fullReply.trim()) throw new Error('Empty response from model');
  } catch (error) {
    logger.error(`sendChatMessageSync: Gemini failed, using fallback: ${error.message}`);
    usedFallback = true;
    fullReply = fallbackChatReply(historyForModel, userMessage.content);
  }

  toolEvents.forEach((evt) => {
    conversation.messages.push({
      role: 'assistant',
      content: '',
      toolCalls: evt.calls,
      timestamp: new Date(),
    });
    conversation.messages.push({
      role: 'tool',
      content: '',
      toolResults: evt.results,
      cards: evt.cards,
      timestamp: new Date(),
    });
  });

  const allCards = toolEvents.flatMap((e) => e.cards || []);
  const assistantMessage = { role: 'assistant', content: fullReply, timestamp: new Date(), cards: allCards.length ? allCards : undefined };
  conversation.messages.push(assistantMessage);
  conversation.lastMessageAt = new Date();
  if (conversation.messages.filter((m) => m.role === 'user').length === 1) {
    conversation.title = deriveTitle(message);
  }
  await conversation.save();

  res.json({
    success: true,
    data: {
      conversationId: conversation._id,
      title: conversation.title,
      usedFallback,
      message: assistantMessage,
    },
  });
});
