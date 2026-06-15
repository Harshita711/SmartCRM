/**
 * Chat Tools
 * --------------------------------------------------------------------------
 * Defines the function-calling "tools" the conversational AI assistant can
 * invoke to actually OPERATE the CRM (build/save audiences, draft/launch
 * campaigns, run the marketing agent, pull analytics) instead of only
 * discussing them. Each tool has:
 *   - a Gemini-compatible function declaration (name, description, schema)
 *   - an executor that runs against the real database / services and
 *     returns a small JSON payload + a "card" descriptor the frontend can
 *     render as a rich, interactive component inside the chat.
 */

import Customer from '../models/Customer.js';
import Campaign from '../models/Campaign.js';
import Segment from '../models/Segment.js';
import Order from '../models/Order.js';
import Communication from '../models/Communication.js';
import logger from '../config/logger.js';
import { buildSegmentQuery, validateRuleGroup } from './segmentEngine.js';
import {
  generateSegmentFromText,
  generateCampaignDraft,
  runMarketingAgent,
} from './geminiService.js';

const rate = (numerator, denominator) =>
  denominator > 0 ? Number(((numerator / denominator) * 100).toFixed(2)) : 0;

/* ------------------------------------------------------------------ */
/* Tool declarations (Gemini function-calling schema)                  */
/* ------------------------------------------------------------------ */

export const TOOL_DECLARATIONS = [
  {
    name: 'build_audience_preview',
    description:
      'Convert a natural-language audience description into segment filter rules and preview how many customers match, with a small sample. Use this when the user describes a target audience but has not asked you to save it yet.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'The natural language description of the target audience, e.g. "loyal customers from Chennai who spent over 5000".',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'create_segment',
    description:
      'Create and save a new customer segment in the CRM from a natural-language audience description. Use this only when the user explicitly asks to create, save, or build a segment (not just preview one).',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Natural language description of the audience to turn into a saved segment.',
        },
        name: {
          type: 'string',
          description: 'Optional custom name for the segment. If omitted, an AI-generated name is used.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'generate_campaign_draft',
    description:
      'Generate a full AI campaign draft (target segment, channel, offer, message and reasoning) from a high-level marketing goal or prompt. Use this when the user wants campaign ideas or a draft but has not asked you to actually create/save it yet.',
    parameters: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'High-level marketing goal or campaign idea, e.g. "win back inactive coffee customers with a discount".',
        },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'create_campaign',
    description:
      'Create and save a new campaign (as a draft) in the CRM, including creating and saving its target segment. Use this only when the user explicitly asks to create, save, or set up a campaign in the system (not just brainstorm one).',
    parameters: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'High-level marketing goal describing the campaign to create.',
        },
        name: {
          type: 'string',
          description: 'Optional custom campaign name. If omitted, an AI-generated name is used.',
        },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'run_marketing_agent',
    description:
      'Run the autonomous AI marketing agent: analyze the current customer base against a business goal and produce a recommended audience, channel, campaign and reasoning. Use this for broad, strategic requests like "how do we increase repeat purchases" or "help me grow revenue this month".',
    parameters: {
      type: 'object',
      properties: {
        goal: {
          type: 'string',
          description: 'The high-level business goal, e.g. "increase repeat purchases in the next 30 days".',
        },
      },
      required: ['goal'],
    },
  },
  {
    name: 'get_analytics_summary',
    description:
      'Fetch a live snapshot of CRM analytics: total customers, total orders, revenue, active campaigns, and message delivery/open/click/conversion rates. Use this when the user asks how things are performing, for current numbers, or "how are we doing".',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'list_recent_campaigns',
    description:
      'List the most recent campaigns with their status and key performance stats (sent, delivered, opened, clicked, converted). Use this when the user asks about recent or existing campaigns.',
    parameters: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Max number of campaigns to return (default 5, max 10).',
        },
      },
    },
  },
];

/* ------------------------------------------------------------------ */
/* Executors                                                            */
/* ------------------------------------------------------------------ */

const sampleFields = 'name email segment totalSpend totalOrders location category';

const buildAudiencePreview = async ({ query }) => {
  const result = await generateSegmentFromText(query);
  validateRuleGroup(result.ruleGroup);

  const mongoQuery = buildSegmentQuery(result.ruleGroup);
  const [audienceSize, sample] = await Promise.all([
    Customer.countDocuments(mongoQuery),
    Customer.find(mongoQuery).limit(5).select(sampleFields),
  ]);

  return {
    card: {
      type: 'audience_preview',
      title: result.name,
      data: {
        name: result.name,
        description: result.description,
        ruleGroup: result.ruleGroup,
        audienceSize,
        sample,
        naturalLanguageQuery: query,
      },
    },
    modelSummary: {
      name: result.name,
      description: result.description,
      audienceSize,
      ruleGroup: result.ruleGroup,
    },
  };
};

const createSegmentTool = async ({ query, name }) => {
  const result = await generateSegmentFromText(query);
  validateRuleGroup(result.ruleGroup);

  const mongoQuery = buildSegmentQuery(result.ruleGroup);
  const audienceSize = await Customer.countDocuments(mongoQuery);

  const segment = await Segment.create({
    name: name || result.name,
    description: result.description,
    ruleGroup: result.ruleGroup,
    source: 'ai-generated',
    naturalLanguageQuery: query,
    audienceSize,
    lastEvaluatedAt: new Date(),
  });

  return {
    card: {
      type: 'segment_created',
      title: segment.name,
      data: {
        id: segment._id,
        name: segment.name,
        description: segment.description,
        ruleGroup: segment.ruleGroup,
        audienceSize: segment.audienceSize,
        source: segment.source,
      },
    },
    modelSummary: {
      id: segment._id.toString(),
      name: segment.name,
      audienceSize: segment.audienceSize,
      savedAsSegment: true,
    },
  };
};

const generateCampaignDraftTool = async ({ prompt }) => {
  const [cities, categories] = await Promise.all([
    Customer.distinct('location.city'),
    Customer.distinct('category'),
  ]);

  const draft = await generateCampaignDraft(prompt, cities, categories);
  validateRuleGroup(draft.segment.ruleGroup);

  const mongoQuery = buildSegmentQuery(draft.segment.ruleGroup);
  const audienceSize = await Customer.countDocuments(mongoQuery);

  const data = { ...draft, segment: { ...draft.segment, audienceSize }, prompt };

  return {
    card: {
      type: 'campaign_draft',
      title: draft.campaignName,
      data,
    },
    modelSummary: {
      campaignName: draft.campaignName,
      channel: draft.channel,
      offer: draft.offer,
      audienceSize,
      segmentName: draft.segment.name,
      reasoning: draft.reasoning,
    },
  };
};

const createCampaignTool = async ({ prompt, name }) => {
  const [cities, categories] = await Promise.all([
    Customer.distinct('location.city'),
    Customer.distinct('category'),
  ]);

  const draft = await generateCampaignDraft(prompt, cities, categories);
  validateRuleGroup(draft.segment.ruleGroup);

  const mongoQuery = buildSegmentQuery(draft.segment.ruleGroup);
  const audienceSize = await Customer.countDocuments(mongoQuery);

  const segment = await Segment.create({
    name: draft.segment.name,
    description: draft.segment.description,
    ruleGroup: draft.segment.ruleGroup,
    source: 'ai-generated',
    naturalLanguageQuery: prompt,
    audienceSize,
    lastEvaluatedAt: new Date(),
  });

  const campaign = await Campaign.create({
    name: name || draft.campaignName,
    segment: segment._id,
    channel: draft.channel,
    offer: draft.offer,
    objective: draft.objective,
    message: draft.message,
    aiGenerated: true,
    aiReasoning: draft.reasoning || '',
    status: 'draft',
    stats: { audienceSize },
  });

  return {
    card: {
      type: 'campaign_created',
      title: campaign.name,
      data: {
        id: campaign._id,
        name: campaign.name,
        channel: campaign.channel,
        offer: campaign.offer,
        objective: campaign.objective,
        message: campaign.message,
        status: campaign.status,
        aiReasoning: campaign.aiReasoning,
        segment: {
          id: segment._id,
          name: segment.name,
          audienceSize: segment.audienceSize,
        },
      },
    },
    modelSummary: {
      id: campaign._id.toString(),
      name: campaign.name,
      status: campaign.status,
      channel: campaign.channel,
      segmentName: segment.name,
      audienceSize: segment.audienceSize,
      savedAsCampaign: true,
      note: 'Created as a draft. The user can open it from Campaigns to review and launch.',
    },
  };
};

const runMarketingAgentTool = async ({ goal }) => {
  const [totalCustomers, segmentBreakdown, categoryBreakdown, avgSpendAgg] = await Promise.all([
    Customer.countDocuments(),
    Customer.aggregate([{ $group: { _id: '$segment', count: { $sum: 1 } } }]),
    Customer.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
    Customer.aggregate([
      { $group: { _id: null, avgSpend: { $avg: '$totalSpend' }, avgOrders: { $avg: '$totalOrders' } } },
    ]),
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

  const data = {
    ...plan,
    recommendedAudience: { ...plan.recommendedAudience, audienceSize },
    customerStats,
    goal,
  };

  return {
    card: {
      type: 'agent_plan',
      title: plan.campaign?.name || `Plan for: ${goal.slice(0, 40)}`,
      data,
    },
    modelSummary: {
      analysis: plan.analysis,
      recommendedChannel: plan.recommendedChannel,
      audienceSize,
      campaignName: plan.campaign?.name,
      expectedImpact: plan.expectedImpact,
    },
  };
};

const getAnalyticsSummaryTool = async () => {
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

  const data = {
    totalCustomers,
    totalOrders,
    activeCampaigns,
    messagesSent: stats.sent,
    deliveryRate: rate(stats.delivered, stats.sent),
    openRate: rate(stats.opened, stats.delivered),
    clickRate: rate(stats.clicked, stats.opened),
    conversionRate: rate(stats.converted, stats.sent),
    totalRevenue,
  };

  return {
    card: { type: 'analytics_summary', title: 'Live CRM Snapshot', data },
    modelSummary: data,
  };
};

const listRecentCampaignsTool = async ({ limit = 5 } = {}) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 5, 1), 10);

  const campaigns = await Campaign.find()
    .populate('segment', 'name audienceSize')
    .sort({ createdAt: -1 })
    .limit(safeLimit);

  const items = campaigns.map((c) => ({
    id: c._id,
    name: c.name,
    channel: c.channel,
    status: c.status,
    segment: c.segment ? { name: c.segment.name, audienceSize: c.segment.audienceSize } : null,
    stats: c.stats,
    createdAt: c.createdAt,
  }));

  return {
    card: { type: 'campaign_list', title: 'Recent Campaigns', data: { items } },
    modelSummary: { count: items.length, items: items.map((i) => ({ name: i.name, status: i.status, channel: i.channel })) },
  };
};

/* ------------------------------------------------------------------ */
/* Dispatcher                                                           */
/* ------------------------------------------------------------------ */

const EXECUTORS = {
  build_audience_preview: buildAudiencePreview,
  create_segment: createSegmentTool,
  generate_campaign_draft: generateCampaignDraftTool,
  create_campaign: createCampaignTool,
  run_marketing_agent: runMarketingAgentTool,
  get_analytics_summary: getAnalyticsSummaryTool,
  list_recent_campaigns: listRecentCampaignsTool,
};

/**
 * Executes a named tool with the given args. Always returns a JSON-safe
 * object. Never throws - errors are captured and returned so the model can
 * gracefully explain the failure to the user.
 */
export const executeTool = async (name, args = {}) => {
  const executor = EXECUTORS[name];
  if (!executor) {
    return { error: `Unknown tool: ${name}` };
  }

  try {
    const result = await executor(args || {});
    return { success: true, ...result };
  } catch (error) {
    logger.error(`Tool execution failed (${name}): ${error.message}`);
    return { success: false, error: error.message || 'Tool execution failed' };
  }
};

export default {
  TOOL_DECLARATIONS,
  executeTool,
};
