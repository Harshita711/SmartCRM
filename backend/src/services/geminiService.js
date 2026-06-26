import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../config/logger.js';
import { TOOL_DECLARATIONS, executeTool } from './chatTools.js';

const apiKey = process.env.GEMINI_API_KEY;
const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

let genAI = null;
if (apiKey && apiKey !== 'your_gemini_api_key_here') {
  genAI = new GoogleGenerativeAI(apiKey);
} else {
  logger.warn('GEMINI_API_KEY not configured - AI features will use fallback responses');
}

const getModel = (jsonMode = false) => {
  if (!genAI) return null;
  return genAI.getGenerativeModel({
    model: modelName,
    generationConfig: jsonMode
      ? { responseMimeType: 'application/json', temperature: 0.4 }
      : { temperature: 0.7 },
  });
};

/**
 * Calls Gemini with a prompt and attempts to parse JSON from the response.
 * Strips markdown code fences if present. Throws on failure so callers can fallback.
 */
const generateJSON = async (prompt) => {
  const model = getModel(true);
  if (!model) throw new Error('Gemini not configured');

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleaned);
};

const generateText = async (prompt) => {
  const model = getModel(false);
  if (!model) throw new Error('Gemini not configured');

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
};

/* ------------------------------------------------------------------ */
/* Feature 1: Natural Language Audience Generation                     */
/* ------------------------------------------------------------------ */

const SEGMENT_FIELDS_DOC = `
Available customer fields and operators for segment rules:
- totalSpend (number, INR): operators gt, gte, lt, lte, eq
- totalOrders (number): operators gt, gte, lt, lte, eq
- lastPurchaseDate (date): operators before, after, olderThanDays (value = number of days)
- location.city (string): operators eq, neq, in (value = array of city names)
- category (string, one of Fashion|Coffee|Beauty|Retail|General): operators eq, neq, in
- segment (string, one of New|Active|Loyal|At Risk|Inactive|Premium|Churned): operators eq, in
- leadScore (number 0-100): operators gt, gte, lt, lte
`;

export const generateSegmentFromText = async (naturalLanguageQuery) => {
  const prompt = `You are an audience segmentation engine for a CRM.
Convert the following natural language request into a structured JSON rule group for filtering customers.

${SEGMENT_FIELDS_DOC}

Rule shape: { "field": "...", "operator": "...", "value": ... }
Rule group shape: { "condition": "AND" | "OR", "rules": [Rule], "groups": [] }

Respond ONLY with valid JSON in this exact shape:
{
  "name": "short descriptive segment name",
  "description": "one sentence description of who this targets",
  "ruleGroup": { "condition": "AND", "rules": [...], "groups": [] }
}

User request: "${naturalLanguageQuery}"`;

  try {
    const parsed = await generateJSON(prompt);
    return parsed;
  } catch (error) {
    logger.error(`generateSegmentFromText fallback: ${error.message}`);
    return fallbackSegmentFromText(naturalLanguageQuery);
  }
};

// Heuristic fallback used when Gemini is unavailable or fails to return valid JSON
const fallbackSegmentFromText = (text) => {
  const rules = [];
  const lower = text.toLowerCase();

  const spendMatch = lower.match(/(?:spent|spend|spending)\s*(?:above|over|more than|greater than)?\s*(?:rs\.?|inr|₹)?\s*([\d,]+)/);
  if (spendMatch) {
    rules.push({ field: 'totalSpend', operator: 'gt', value: Number(spendMatch[1].replace(/,/g, '')) });
  }

  const dayMatch = lower.match(/(\d+)\s*days?/);
  if (dayMatch && lower.includes('purchase')) {
    rules.push({ field: 'lastPurchaseDate', operator: 'olderThanDays', value: Number(dayMatch[1]) });
  }

  const orderMatch = lower.match(/(?:purchased|ordered|bought).*?(?:more than|over|above)\s*(\d+)\s*times?/);
  if (orderMatch) {
    rules.push({ field: 'totalOrders', operator: 'gt', value: Number(orderMatch[1]) });
  }

  ['fashion', 'coffee', 'beauty', 'retail'].forEach((cat) => {
    if (lower.includes(cat)) {
      rules.push({ field: 'category', operator: 'eq', value: cat.charAt(0).toUpperCase() + cat.slice(1) });
    }
  });

  if (lower.includes('loyal')) {
    rules.push({ field: 'segment', operator: 'eq', value: 'Loyal' });
  }
  if (lower.includes('inactive') || lower.includes('churn')) {
    rules.push({ field: 'segment', operator: 'in', value: ['Inactive', 'Churned'] });
  }
  if (lower.includes('premium')) {
    rules.push({ field: 'segment', operator: 'eq', value: 'Premium' });
  }

  const cities = ['chennai', 'mumbai', 'delhi', 'bangalore', 'bengaluru', 'pune', 'hyderabad', 'kolkata'];
  cities.forEach((city) => {
    if (lower.includes(city)) {
      rules.push({ field: 'location.city', operator: 'eq', value: city.charAt(0).toUpperCase() + city.slice(1) });
    }
  });

  if (rules.length === 0) {
    rules.push({ field: 'totalOrders', operator: 'gte', value: 0 });
  }

  return {
    name: `Segment: ${text.slice(0, 40)}`,
    description: `Auto-generated (fallback) from: "${text}"`,
    ruleGroup: { condition: 'AND', rules, groups: [] },
  };
};

/* ------------------------------------------------------------------ */
/* Feature 2: AI Message Generation                                     */
/* ------------------------------------------------------------------ */

export const generateCampaignMessage = async ({ objective, offer, channel, audienceDescription }) => {
  const prompt = `You are a marketing copywriter for a retail/e-commerce brand.
Write a short, persuasive, ready-to-send ${channel} message for a marketing campaign.

Campaign objective: ${objective || 'general engagement'}
Offer: ${offer || 'none specified'}
Target audience: ${audienceDescription || 'general customers'}

Constraints:
- Keep it concise (under 320 characters for SMS/WhatsApp, under 600 for Email).
- Use a friendly, on-brand tone.
- Include a clear call to action.
- Use "{{name}}" as a placeholder for the customer's first name.
- Do not include explanations, only the message text.

Respond with ONLY the message text, no quotes, no markdown.`;

  try {
    const text = await generateText(prompt);
    return text.replace(/^["']|["']$/g, '');
  } catch (error) {
    logger.error(`generateCampaignMessage fallback: ${error.message}`);
    return fallbackMessage({ objective, offer, channel });
  }
};

const fallbackMessage = ({ objective, offer, channel }) => {
  const offerText = offer ? ` Enjoy ${offer} just for you.` : '';
  if (channel === 'Email') {
    return `Hi {{name}}, we miss you! ${objective || 'Check out what\'s new'}.${offerText} Click here to explore now.`;
  }
  return `Hi {{name}}! ${objective || 'We have something special for you'}.${offerText} Reply STOP to opt out.`;
};

/* ------------------------------------------------------------------ */
/* Feature 3 & 4: AI Campaign Recommendations & Optimization            */
/* ------------------------------------------------------------------ */

export const generateOptimizationSuggestions = async (campaignStats) => {
  const prompt = `You are a marketing analytics expert. Given these campaign performance stats (as JSON), provide 3-5 short, actionable optimization recommendations.

Stats: ${JSON.stringify(campaignStats)}

Respond ONLY with valid JSON in this shape:
{ "recommendations": ["short actionable tip", "..."] }`;

  try {
    const parsed = await generateJSON(prompt);
    return parsed.recommendations || [];
  } catch (error) {
    logger.error(`generateOptimizationSuggestions fallback: ${error.message}`);
    return fallbackOptimizationSuggestions(campaignStats);
  }
};

const fallbackOptimizationSuggestions = (stats = {}) => {
  const tips = [];
  const sent = stats.sent || 1;
  const deliveryRate = (stats.delivered || 0) / sent;
  const openRate = (stats.opened || 0) / Math.max(stats.delivered || 1, 1);
  const clickRate = (stats.clicked || 0) / Math.max(stats.opened || 1, 1);

  if (deliveryRate < 0.9) tips.push('Delivery rate is below 90% - validate contact data and remove invalid addresses.');
  if (openRate < 0.3) tips.push('Open rate is low. Consider shorter, more curiosity-driven subject lines.');
  if (clickRate < 0.2) tips.push('Click-through rate is low. Try adding a single, clear call-to-action button.');
  tips.push('Test sending at different times of day to find peak engagement windows.');
  tips.push('Segment your audience further by purchase category for more relevant offers.');

  return tips.slice(0, 5);
};

/* ------------------------------------------------------------------ */
/* Feature 5: AI-Generated Analytics Insights                          */
/* ------------------------------------------------------------------ */

export const generateAnalyticsInsights = async (analyticsData) => {
  const prompt = `You are a CRM analytics assistant. Analyze the following marketing analytics data (JSON) and produce 3-5 concise, specific insights or observations a marketing manager would find useful. Mention concrete numbers where relevant. Compare channels if data allows.

Data: ${JSON.stringify(analyticsData)}

Respond ONLY with valid JSON: { "insights": ["insight 1", "insight 2", ...] }`;

  try {
    const parsed = await generateJSON(prompt);
    return parsed.insights || [];
  } catch (error) {
    logger.error(`generateAnalyticsInsights fallback: ${error.message}`);
    return fallbackInsights(analyticsData);
  }
};

const fallbackInsights = (data = {}) => {
  const insights = [];
  const { channelPerformance = [] } = data;

  if (channelPerformance.length >= 2) {
    const sorted = [...channelPerformance].sort((a, b) => (b.deliveryRate || 0) - (a.deliveryRate || 0));
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    if (best && worst && best.channel !== worst.channel) {
      const diff = Math.round(((best.deliveryRate || 0) - (worst.deliveryRate || 0)) * 100);
      if (diff > 0) {
        insights.push(`${best.channel} performs ${diff}% better than ${worst.channel} in delivery rate.`);
      }
    }
  }

  insights.push('Open rate is low. Consider shorter, curiosity-driven subject lines.');
  insights.push('Revisit inactive segments - re-engagement campaigns often recover 5-10% of churned customers.');
  insights.push('Conversion rate correlates strongly with personalized offers - consider dynamic discount codes.');

  return insights;
};

/* ------------------------------------------------------------------ */
/* AI Campaign Generator - full draft from a single prompt              */
/* ------------------------------------------------------------------ */

export const generateCampaignDraft = async (prompt, availableCities = [], availableCategories = []) => {
  const llmPrompt = `You are an AI marketing campaign planner for a CRM.
Given a high-level marketing goal, design a complete campaign draft.

${SEGMENT_FIELDS_DOC}
Available cities in the database: ${availableCities.join(', ') || 'various Indian cities'}
Available product categories: ${availableCategories.join(', ') || 'Fashion, Coffee, Beauty, Retail'}

Goal: "${prompt}"

Respond ONLY with valid JSON in this exact shape:
{
  "campaignName": "string",
  "segment": {
    "name": "string",
    "description": "string",
    "ruleGroup": { "condition": "AND", "rules": [...], "groups": [] }
  },
  "channel": "Email" | "SMS" | "WhatsApp" | "Push",
  "offer": "string",
  "objective": "string",
  "message": "ready to send message using {{name}} placeholder",
  "reasoning": "2-3 sentence explanation of why this audience, channel and offer were chosen"
}`;

  try {
    const parsed = await generateJSON(llmPrompt);
    return parsed;
  } catch (error) {
    logger.error(`generateCampaignDraft fallback: ${error.message}`);
    return fallbackCampaignDraft(prompt);
  }
};

const fallbackCampaignDraft = (prompt) => {
  const lower = prompt.toLowerCase();
  let rules = [];
  let channel = 'Email';
  let objective = prompt;
  let offer = '10% off your next purchase';

  if (lower.includes('win-back') || lower.includes('winback') || lower.includes('inactive')) {
    rules = [
      { field: 'segment', operator: 'in', value: ['Inactive', 'At Risk', 'Churned'] },
      { field: 'lastPurchaseDate', operator: 'olderThanDays', value: 45 },
    ];
    channel = 'WhatsApp';
    offer = '20% off as a welcome back gift';
    objective = 'Win back inactive customers with a special comeback offer';
  } else if (lower.includes('premium')) {
    rules.push({ field: 'segment', operator: 'eq', value: 'Premium' });
    channel = 'Email';
  } else {
    rules.push({ field: 'totalOrders', operator: 'gte', value: 1 });
  }

  return {
    campaignName: `AI Campaign: ${prompt.slice(0, 40)}`,
    segment: {
      name: `Auto Segment: ${prompt.slice(0, 30)}`,
      description: `Generated for: ${prompt}`,
      ruleGroup: { condition: 'AND', rules, groups: [] },
    },
    channel,
    offer,
    objective,
    message: `Hi {{name}}, ${objective}. Enjoy ${offer}. Don't miss out - shop now!`,
    reasoning: 'Fallback heuristic draft generated because the AI service was unavailable. Based on keyword matching of your request.',
  };
};

/* ------------------------------------------------------------------ */
/* Feature 6: AI Marketing Agent                                        */
/* ------------------------------------------------------------------ */

export const runMarketingAgent = async (goal, customerStats = {}) => {
  const prompt = `You are an autonomous AI marketing agent inside a CRM. The user gave you a high-level business goal. You have access to aggregate customer data (JSON below).

Goal: "${goal}"

Customer data summary: ${JSON.stringify(customerStats)}

${SEGMENT_FIELDS_DOC}

Produce a complete launch plan. Respond ONLY with valid JSON in this exact shape:
{
  "analysis": "2-4 sentence analysis of the current customer base relevant to this goal",
  "recommendedAudience": {
    "name": "string",
    "description": "string",
    "ruleGroup": { "condition": "AND", "rules": [...], "groups": [] }
  },
  "recommendedChannel": "Email" | "SMS" | "WhatsApp" | "Push",
  "campaign": {
    "name": "string",
    "objective": "string",
    "offer": "string",
    "message": "message using {{name}} placeholder"
  },
  "reasoning": ["step 1 reasoning", "step 2 reasoning", "step 3 reasoning"],
  "expectedImpact": "1-2 sentence prediction of expected outcome"
}`;

  try {
    return await generateJSON(prompt);
  } catch (error) {
    logger.error(`runMarketingAgent fallback: ${error.message}`);
    return fallbackAgentPlan(goal);
  }
};

const fallbackAgentPlan = (goal) => {
  const lower = goal.toLowerCase();
  let rules = [{ field: 'totalOrders', operator: 'gte', value: 2 }];
  let channel = 'WhatsApp';
  let offer = '15% off on your next 2 orders';

  if (lower.includes('repeat')) {
    rules = [
      { field: 'totalOrders', operator: 'eq', value: 1 },
      { field: 'lastPurchaseDate', operator: 'olderThanDays', value: 14 },
    ];
  }

  return {
    analysis: `Based on a fallback heuristic analysis, customers with limited repeat purchases are the best target for the goal: "${goal}".`,
    recommendedAudience: {
      name: 'AI Agent: Repeat Purchase Targets',
      description: 'Customers with exactly one order placed more than 14 days ago',
      ruleGroup: { condition: 'AND', rules, groups: [] },
    },
    recommendedChannel: channel,
    campaign: {
      name: `AI Agent Campaign: ${goal.slice(0, 40)}`,
      objective: goal,
      offer,
      message: `Hi {{name}}, loved your last order? Come back and enjoy ${offer}. Tap to shop now!`,
    },
    reasoning: [
      'Identified customers with low repeat-purchase frequency as the highest-leverage segment.',
      'Selected WhatsApp for higher open rates among Indian consumers based on category benchmarks.',
      'Proposed a percentage discount offer to directly incentivize a second purchase.',
    ],
    expectedImpact: 'Expected to convert 8-12% of the targeted segment into repeat purchasers within 2 weeks.',
  };
};

/* ------------------------------------------------------------------ */
/* Conversational AI Assistant (ChatGPT-style, context-aware)           */
/* ------------------------------------------------------------------ */

const CHAT_SYSTEM_PROMPT = `You are the AI assistant embedded inside SmartCRM, an AI-native CRM platform for retail and e-commerce brands.

You behave like a top-tier conversational assistant (similar to ChatGPT, Claude, or Gemini):
- You are conversational, warm, and natural - never robotic or templated.
- You REMEMBER and USE the full conversation history provided to you. Always resolve pronouns, "it", "that", "the campaign", "this segment", etc. against prior turns.
- You ask short clarifying questions when the user's request is ambiguous, instead of guessing.
- You adapt your depth and tone to what the user actually needs - sometimes a quick answer, sometimes a structured breakdown.
- You explain your reasoning when it's useful, but don't pad responses with unnecessary boilerplate.
- You NEVER repeat a previous answer verbatim just because a similar question was asked - always respond to what was actually asked, in the context of where the conversation now stands.
- You avoid generic filler like "As an AI language model..." or "I'd be happy to help!" repeated every message.

Your domain expertise (use this when relevant, but you can also discuss general topics):
- CRM strategy, customer segmentation, and audience targeting
- Marketing campaign design (Email, SMS, WhatsApp, Push) - objectives, offers, messaging, channel selection
- Campaign analytics - delivery/open/click/conversion rates, what they mean, how to improve them
- Customer lifecycle stages (New, Active, Loyal, At Risk, Inactive, Premium, Churned) and how to act on each
- Practical, India-market-aware marketing recommendations (e.g. WhatsApp performs well for re-engagement)

Available customer segmentation fields you can reference when discussing audiences:
- totalSpend, totalOrders, lastPurchaseDate, location.city, category (Fashion/Coffee/Beauty/Retail/General), segment, leadScore

## Tools - you can actually OPERATE the CRM

You have function-calling tools that run for real against the live database. Use them whenever they would help, rather than only describing what could be done:
- build_audience_preview - preview an audience from a natural-language description (no save)
- create_segment - actually create and save a new segment
- generate_campaign_draft - draft a full campaign (segment, channel, offer, message) from a goal (no save)
- create_campaign - actually create and save a new campaign (as a draft, with its segment)
- run_marketing_agent - run the full AI marketing agent for a business goal
- get_analytics_summary - pull live CRM performance numbers
- list_recent_campaigns - list recent campaigns and their stats

Rules for using tools:
- If the user asks you to "build", "preview", "show me", or "what would target..." -> use the preview/draft tools (build_audience_preview, generate_campaign_draft, run_marketing_agent). These do not save anything.
- If the user asks you to "create", "save", "set up", "launch" (as a draft), or "add this to my segments/campaigns" -> use create_segment or create_campaign. These persist real records.
- Only call create_segment / create_campaign when the user's intent to save is clear. If unsure, preview first and ask if they'd like it saved.
- After a tool returns, its results are rendered as a rich card directly in the chat UI for the user - you do NOT need to repeat all the raw data (e.g. full JSON rule groups or full sample tables) back in your text. Instead, briefly summarize what you found/did in 1-3 sentences and suggest a clear next step.
- If a tool errors, briefly explain that and offer to try a different phrasing or approach.
- You can call multiple tools in one turn if the request needs it (e.g. get analytics, then generate a campaign draft based on it).

Formatting:
- Use Markdown: headings, bold, bullet lists, numbered steps, and tables where they make information clearer.
- Use fenced code blocks for any JSON, rule definitions, or message templates only when the user explicitly wants to see raw structure (tool results already render as cards).
- Keep responses focused - don't repeat information already established earlier in the conversation unless asked to summarize.

If the user asks about something only loosely related to CRM (general chit-chat, other topics), you can still discuss it naturally.`;

/**
 * Build the Gemini "contents" array from stored chat history + the new user message.
 * Gemini requires alternating user/model turns starting with "user".
 *
 * History entries may include tool-related turns persisted as:
 *   { role: 'assistant', content: '', toolCalls: [{ name, args }] }
 *   { role: 'tool', toolResults: [{ name, response }] }
 * These are converted into Gemini functionCall / functionResponse parts so the
 * model retains memory of tools it already ran in this conversation.
 */
const buildChatContents = (history = [], newMessage) => {
  const contents = [];

  history.forEach((m) => {
    if (m.role === 'system') return;

    if (m.role === 'tool') {
      if (Array.isArray(m.toolResults) && m.toolResults.length) {
        contents.push({
          role: 'user',
          parts: m.toolResults.map((tr) => ({
            functionResponse: { name: tr.name, response: tr.response || {} },
          })),
        });
      }
      return;
    }

    if (m.role === 'assistant' && Array.isArray(m.toolCalls) && m.toolCalls.length) {
      const parts = [];
      if (m.content) parts.push({ text: m.content });
      m.toolCalls.forEach((tc) => {
        parts.push({ functionCall: { name: tc.name, args: tc.args || {} } });
      });
      contents.push({ role: 'model', parts });
      return;
    }

    contents.push({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    });
  });

  if (newMessage !== undefined && newMessage !== null) {
    contents.push({ role: 'user', parts: [{ text: newMessage }] });
  }

  // Gemini requires the first content to have role "user" - drop leading model turns if any
  while (contents.length && contents[0].role !== 'user') {
    contents.shift();
  }

  return contents;
};

const CHAT_TOOLS = [{ functionDeclarations: TOOL_DECLARATIONS }];

const MAX_TOOL_ROUNDS = 4;

/**
 * Extracts functionCall parts from a Gemini response candidate.
 */
const extractFunctionCalls = (response) => {
  try {
    const calls = response.functionCalls?.();
    if (calls && calls.length) return calls;
  } catch {
    /* fall through to manual extraction */
  }
  const parts = response.candidates?.[0]?.content?.parts || [];
  return parts.filter((p) => p.functionCall).map((p) => p.functionCall);
};

/**
 * Non-streaming conversational chat completion with full history context.
 * Supports multi-round function calling: if the model requests tool calls,
 * they are executed against the live CRM and fed back to the model until it
 * produces a final text reply (or MAX_TOOL_ROUNDS is reached).
 *
 * Returns { text, toolEvents } where toolEvents is an array of
 * { calls: [{name, args}], results: [{name, response}], cards: [...] }
 * - one entry per round of tool use (usually 0 or 1 entries).
 */
export const generateChatReply = async (history, newMessage) => {
  if (!genAI) throw new Error('Gemini not configured');

  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: CHAT_SYSTEM_PROMPT,
    tools: CHAT_TOOLS,
    generationConfig: { temperature: 0.8 },
  });

  let contents = buildChatContents(history, newMessage);
  const toolEvents = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const result = await model.generateContent({ contents });
    const response = result.response;
    const functionCalls = extractFunctionCalls(response);

    if (!functionCalls || functionCalls.length === 0) {
      return { text: response.text().trim(), toolEvents };
    }

    const modelParts = response.candidates?.[0]?.content?.parts || [];
    contents.push({ role: 'model', parts: modelParts });

    const results = [];
    const cards = [];
    for (const call of functionCalls) {
      // eslint-disable-next-line no-await-in-loop
      const toolResult = await executeTool(call.name, call.args || {});
      const response_ = toolResult.error
        ? { error: toolResult.error }
        : toolResult.modelSummary || { success: toolResult.success };
      results.push({ name: call.name, response: response_ });
      if (toolResult.card) cards.push(toolResult.card);
    }

    toolEvents.push({
      calls: functionCalls.map((c) => ({ name: c.name, args: c.args || {} })),
      results,
      cards,
    });

    contents.push({
      role: 'user',
      parts: results.map((r) => ({ functionResponse: { name: r.name, response: r.response } })),
    });
  }

  // Exceeded tool rounds - ask the model for a final summary without tools
  const finalResult = await model.generateContent({ contents });
  return { text: finalResult.response.text().trim(), toolEvents };
};

/**
 * Streaming conversational chat completion. Calls onChunk(text) for each token chunk
 * of the FINAL text reply, and onToolEvent(toolEvent) whenever a round of tool calls
 * completes (so the UI can render result cards as they become available).
 * Returns { text, toolEvents }.
 */
export const streamChatReply = async (history, newMessage, onChunk, onToolEvent, onToolCall) => {
  if (!genAI) throw new Error('Gemini not configured');

  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: CHAT_SYSTEM_PROMPT,
    tools: CHAT_TOOLS,
    generationConfig: { temperature: 0.8 },
  });

  let contents = buildChatContents(history, newMessage);
  const toolEvents = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const result = await model.generateContent({ contents });
    const response = result.response;
    const functionCalls = extractFunctionCalls(response);

    if (!functionCalls || functionCalls.length === 0) {
      const text = response.text().trim();
      // Simulate streaming for a consistent UX (Gemini function-calling responses
      // aren't reliably streamable mid-tool-loop, so we stream the final text in chunks).
      const chunkSize = 24;
      for (let i = 0; i < text.length; i += chunkSize) {
        onChunk(text.slice(i, i + chunkSize));
      }
      return { text, toolEvents };
    }

    const modelParts = response.candidates?.[0]?.content?.parts || [];
    contents.push({ role: 'model', parts: modelParts });

    const results = [];
    const cards = [];
    for (const call of functionCalls) {
      if (onToolCall) onToolCall({ name: call.name, args: call.args || {} });
      // eslint-disable-next-line no-await-in-loop
      const toolResult = await executeTool(call.name, call.args || {});
      const response_ = toolResult.error
        ? { error: toolResult.error }
        : toolResult.modelSummary || { success: toolResult.success };
      results.push({ name: call.name, response: response_ });
      if (toolResult.card) cards.push(toolResult.card);
    }

    const toolEvent = {
      calls: functionCalls.map((c) => ({ name: c.name, args: c.args || {} })),
      results,
      cards,
    };
    toolEvents.push(toolEvent);
    if (onToolEvent) onToolEvent(toolEvent);

    contents.push({
      role: 'user',
      parts: results.map((r) => ({ functionResponse: { name: r.name, response: r.response } })),
    });
  }

  const finalResult = await model.generateContent({ contents });
  const text = finalResult.response.text().trim();
  const chunkSize = 24;
  for (let i = 0; i < text.length; i += chunkSize) {
    onChunk(text.slice(i, i + chunkSize));
  }
  return { text, toolEvents };
};

/**
 * Intelligent, context-aware fallback used only when Gemini is unavailable or errors.
 * Unlike a static template, this looks at the conversation history and the latest
 * message to produce a relevant (if simpler) response, and never repeats the exact
 * same fallback twice in a row.
 */
export const fallbackChatReply = (history = [], newMessage = '') => {
  const lower = newMessage.toLowerCase();
  const lastAssistant = [...history].reverse().find((m) => m.role === 'assistant');
  const recentTopic = [...history].reverse().find((m) => m.role === 'user' && m.content !== newMessage);

  const segments = ['New', 'Active', 'Loyal', 'At Risk', 'Inactive', 'Premium', 'Churned'];
  const channels = ['email', 'sms', 'whatsapp', 'push'];

  // Follow-up about discount/offer referring to a prior campaign discussion
  if ((lower.includes('discount') || lower.includes('offer')) && recentTopic) {
    return `Building on what we discussed ("${recentTopic.content.slice(0, 80)}${recentTopic.content.length > 80 ? '...' : ''}"), here are a few offer ideas you could use:\n\n- **10-15% off** for general re-engagement - low cost, broad appeal\n- **20-25% off** for win-back of At Risk / Inactive / Churned customers - higher incentive needed since they've disengaged\n- **Free shipping or a small gift** for Loyal/Premium customers - rewards without discounting perceived value\n\nWant me to tailor this to a specific segment or channel?\n\n*(Note: AI service is temporarily unavailable, so this is a simplified suggestion rather than a fully tailored one.)*`;
  }

  // Asking about a segment
  const mentionedSegment = segments.find((s) => lower.includes(s.toLowerCase()));
  if (mentionedSegment) {
    return `For the **${mentionedSegment}** segment, here's a quick read:\n\n${segmentBlurb(mentionedSegment)}\n\nYou can build this audience precisely using the AI Audience Builder, or I can suggest a campaign angle for this group if you'd like.\n\n*(AI service is temporarily limited - this is a general response based on segment type.)*`;
  }

  // Asking about a channel
  const mentionedChannel = channels.find((c) => lower.includes(c));
  if (mentionedChannel) {
    return `**${mentionedChannel.toUpperCase()}** works best when:\n\n${channelBlurb(mentionedChannel)}\n\nLet me know your target segment and I can suggest how to pair it with this channel.\n\n*(AI service is temporarily limited - this is a general response.)*`;
  }

  // Greeting / generic open-ended
  if (/^(hi|hey|hello|sup|yo)\b/.test(lower.trim())) {
    return `Hey! I can help with customer segmentation, campaign ideas, analytics, and general CRM strategy. What are you working on right now?`;
  }

  // Generic but varied based on whether this is a follow-up
  if (lastAssistant) {
    return `Got it - continuing from where we left off. Could you tell me a bit more about what you'd like to do next (e.g. target a specific segment, draft a message, or look at performance for a channel)? I can give more specific guidance once I know that.\n\n*(AI service is temporarily limited, so I can't go fully in-depth right now - try again in a moment for a richer response.)*`;
  }

  return `I'd like to help with that. Could you share a bit more detail - for example, which customer segment, channel, or metric you're focused on? Once I know that I can give more targeted recommendations.\n\n*(AI service is temporarily limited right now - responses may be more general than usual.)*`;
};

const segmentBlurb = (segment) => {
  const map = {
    New: '- Recently acquired, no strong habits yet.\n- Focus on onboarding offers and building a second purchase habit.',
    Active: '- Regularly purchasing, healthy engagement.\n- Focus on loyalty perks and cross-sell to increase basket size.',
    Loyal: '- High frequency and tenure.\n- Focus on retention, early access, and referral incentives.',
    'At Risk': '- Engagement is dropping.\n- Focus on timely win-back offers before they churn fully.',
    Inactive: '- No recent activity.\n- Needs a strong incentive (15-25% off) and a "we miss you" message.',
    Premium: '- High spend, high value.\n- Focus on exclusivity, VIP perks, and personalized outreach over discounts.',
    Churned: '- Long inactive, likely lost.\n- Lowest priority for spend, but a strong one-time win-back offer can recover some.',
  };
  return map[segment] || '- A key customer group worth targeted messaging.';
};

const channelBlurb = (channel) => {
  const map = {
    email: '- Sending longer-form content, promotions with images, or newsletters.\n- Audiences who check email regularly (often Loyal/Premium segments).',
    sms: '- Short, time-sensitive offers (flash sales, OTPs, reminders).\n- High open rates but keep messages under ~160 characters.',
    whatsapp: '- Re-engagement and win-back campaigns - high open rates in India.\n- Rich media (images, buttons) and a conversational tone work well.',
    push: '- Quick nudges for app users (cart reminders, flash sales).\n- Best for users who already have the app installed and opted in.',
  };
  return map[channel] || '- A useful channel depending on your audience.';
};

export default {
  generateSegmentFromText,
  generateCampaignMessage,
  generateOptimizationSuggestions,
  generateAnalyticsInsights,
  generateCampaignDraft,
  runMarketingAgent,
  generateChatReply,
  streamChatReply,
  fallbackChatReply,
};
