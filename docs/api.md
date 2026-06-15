# SmartCRM — REST API Reference

Base URL: `https://your-backend.onrender.com/api`

All protected endpoints require:
```
Authorization: Bearer <jwt_token>
```

---

## Auth

### POST /auth/register
Create a new user account.
```json
{ "name": "string", "email": "string", "password": "string (min 6)", "company": "string?" }
```
Response: `{ success, token, user }`

### POST /auth/login
```json
{ "email": "string", "password": "string" }
```
Response: `{ success, token, user }`

### POST /auth/demo
Returns a token for the seeded demo account. No body required.

### GET /auth/me *(Protected)*
Returns the current user.

---

## Customers *(Protected)*

### GET /customers
Query params: `page`, `limit`, `search`, `segment`, `category`, `city`, `sortBy`, `sortOrder`

### GET /customers/meta/filters
Returns distinct cities, categories, and segments for filter dropdowns.

### GET /customers/:id
Returns customer + their full order history.

### POST /customers
```json
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "location": { "city": "string", "state": "string?" },
  "category": "Fashion|Coffee|Beauty|Retail|General"
}
```

### PUT /customers/:id
Partial update with any customer fields.

### DELETE /customers/:id

---

## Orders *(Protected)*

### GET /orders
Query params: `page`, `limit`, `search`, `status`, `customerId`, `sortBy`, `sortOrder`

### GET /orders/meta/summary
Returns `{ totalOrders, totalRevenue, avgOrderValue }`.

### GET /orders/:id

### POST /orders
```json
{
  "customer": "ObjectId",
  "items": [{ "productName": "string", "category": "string", "quantity": 1, "price": 999 }],
  "amount": 999,
  "status": "completed",
  "orderDate": "ISO date string?"
}
```

### PUT /orders/:id
### DELETE /orders/:id

---

## Segments *(Protected)*

### GET /segments
### GET /segments/:id
### GET /segments/:id/customers

### POST /segments/preview
Preview audience size without saving.
```json
{ "ruleGroup": { "condition": "AND", "rules": [...], "groups": [] } }
```
Response: `{ audienceSize, query, sample }`

### POST /segments
```json
{
  "name": "string",
  "description": "string?",
  "ruleGroup": { ... },
  "source": "manual|ai-generated|ai-agent",
  "naturalLanguageQuery": "string?"
}
```

### PUT /segments/:id
### DELETE /segments/:id

#### Rule Group Schema
```json
{
  "condition": "AND | OR",
  "rules": [
    { "field": "totalSpend", "operator": "gt", "value": 5000 },
    { "field": "lastPurchaseDate", "operator": "olderThanDays", "value": 45 },
    { "field": "location.city", "operator": "eq", "value": "Chennai" }
  ],
  "groups": []
}
```

**Supported fields:** `totalSpend`, `totalOrders`, `lastPurchaseDate`, `location.city`, `category`, `segment`, `leadScore`  
**Supported operators:** `gt`, `gte`, `lt`, `lte`, `eq`, `neq`, `in`, `before`, `after`, `olderThanDays`

---

## Campaigns *(Protected)*

### GET /campaigns
Query params: `page`, `limit`, `status`

### GET /campaigns/:id
### GET /campaigns/:id/communications
Query params: `page`, `limit`, `status`

### POST /campaigns
```json
{
  "name": "string",
  "segment": "ObjectId",
  "channel": "Email|SMS|WhatsApp|Push",
  "offer": "string?",
  "objective": "string?",
  "message": "string (use {{name}} for personalization)",
  "isAbTest": false,
  "variants": [],
  "aiGenerated": false,
  "aiReasoning": "string?",
  "scheduledAt": "ISO date?"
}
```

### PUT /campaigns/:id
Only editable in draft/scheduled/paused state.

### DELETE /campaigns/:id
Not allowed while running.

### POST /campaigns/:id/launch
Resolves audience, creates communications, dispatches to channel service. Returns immediately; dispatch runs in background.

### POST /campaigns/:id/pause

---

## Communications

### POST /communications/receipt *(Channel Service callback — API key protected)*
```
Header: x-api-key: <CHANNEL_SERVICE_API_KEY>
```
```json
{
  "communicationId": "ObjectId",
  "status": "SENT|DELIVERED|FAILED|OPENED|READ|CLICKED|CONVERTED",
  "vendorMessageId": "string?",
  "timestamp": "ISO string?",
  "meta": {},
  "revenue": 0
}
```

### GET /communications/:id *(Protected)*

---

## Analytics *(Protected)*

### GET /analytics/dashboard
Returns: `{ totalCustomers, totalOrders, activeCampaigns, messagesSent, deliveryRate, openRate, clickRate, conversionRate, totalRevenue }`

### GET /analytics/recent-campaigns
Last 5 campaigns with stats.

### GET /analytics/recent-activity
Last 10 communication events formatted as an activity feed.

### GET /analytics/audience-growth?days=30
Daily new customer counts.

### GET /analytics/delivery-trend?days=14
Daily sent/delivered/failed/opened/clicked counts.

### GET /analytics/channel-performance
Per-channel delivery, open, click, conversion rates and revenue.

### GET /analytics/insights
Calls Gemini to produce AI-generated insights from channel performance data.

---

## AI *(Protected)*

### POST /ai/audience
```json
{ "query": "Find customers who spent above ₹5000 and haven't purchased in 45 days" }
```
Response: `{ name, description, ruleGroup, audienceSize, sample, naturalLanguageQuery }`

### POST /ai/message
```json
{ "objective": "string", "offer": "string", "channel": "Email", "audienceDescription": "string?" }
```
Response: `{ message }`

### POST /ai/campaign-generator
```json
{ "prompt": "Create a win-back campaign for inactive premium customers" }
```
Response: `{ campaignName, segment: { name, description, ruleGroup, audienceSize }, channel, offer, objective, message, reasoning }`

### GET /ai/optimize/:campaignId
Response: `{ recommendations: ["string", ...] }`

### POST /ai/agent
```json
{ "goal": "Increase repeat purchases" }
```
Response: `{ analysis, recommendedAudience: { name, description, ruleGroup, audienceSize }, recommendedChannel, campaign: { name, objective, offer, message }, reasoning, expectedImpact, customerStats }`

---

## Channel Service API

Base URL: `http://your-channel-service/`

All endpoints require `x-api-key` header.

### POST /send
```json
{
  "communicationId": "string",
  "recipient": "email or phone",
  "channel": "Email|SMS|WhatsApp|Push",
  "message": "string",
  "campaignId": "string",
  "customerId": "string",
  "callbackUrl": "https://crm-backend/api/communications/receipt"
}
```
Response: `{ success, vendorMessageId, status: "queued" }` (202)

### GET /logs
Query: `limit` (max 200)

### GET /logs/:communicationId

### GET /health
