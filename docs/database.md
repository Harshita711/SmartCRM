# SmartCRM — Database Schema

MongoDB Atlas. All collections use Mongoose with schema validation.

---

## users

| Field | Type | Notes |
|---|---|---|
| _id | ObjectId | |
| name | String | required |
| email | String | required, unique, lowercase |
| password | String | bcrypt hashed, select: false |
| role | String | admin \| manager \| viewer |
| company | String | default: "SmartCRM Demo Brand" |
| createdAt | Date | |
| updatedAt | Date | |

**Indexes:** `email` (unique)

---

## customers

| Field | Type | Notes |
|---|---|---|
| _id | ObjectId | |
| name | String | required |
| email | String | required, unique, lowercase |
| phone | String | required |
| location.city | String | required |
| location.state | String | |
| location.country | String | default: India |
| category | String | Fashion \| Coffee \| Beauty \| Retail \| General |
| totalSpend | Number | INR, updated on order create |
| totalOrders | Number | updated on order create |
| lastPurchaseDate | Date | updated on order create |
| segment | String | New \| Active \| Loyal \| Premium \| At Risk \| Inactive \| Churned |
| leadScore | Number | 0–100, computed from spend + orders + recency |
| tags | [String] | |
| isActive | Boolean | default: true |
| createdAt | Date | |
| updatedAt | Date | |

**Indexes:** `email` (unique), `totalSpend`, `totalOrders`, `lastPurchaseDate`, `segment`, `location.city`, `category`, `name + email` (text)

---

## orders

| Field | Type | Notes |
|---|---|---|
| _id | ObjectId | |
| customer | ObjectId | ref: Customer |
| items | [OrderItem] | productName, category, quantity, price |
| amount | Number | total INR |
| status | String | pending \| completed \| cancelled \| refunded |
| orderDate | Date | |
| createdAt | Date | |
| updatedAt | Date | |

**Indexes:** `customer`, `orderDate`, `status`, `amount`, compound `(customer, orderDate desc)`

---

## segments

| Field | Type | Notes |
|---|---|---|
| _id | ObjectId | |
| name | String | required |
| description | String | |
| ruleGroup | Object | { condition: AND\|OR, rules: [...], groups: [...] } |
| ruleGroup.rules[].field | String | one of 7 supported fields |
| ruleGroup.rules[].operator | String | gt, gte, lt, lte, eq, neq, in, before, after, olderThanDays |
| ruleGroup.rules[].value | Mixed | number, string, or array |
| source | String | manual \| ai-generated \| ai-agent |
| naturalLanguageQuery | String | original prompt, if AI-generated |
| audienceSize | Number | last computed count |
| lastEvaluatedAt | Date | |
| createdBy | ObjectId | ref: User |
| createdAt | Date | |
| updatedAt | Date | |

---

## campaigns

| Field | Type | Notes |
|---|---|---|
| _id | ObjectId | |
| name | String | required |
| segment | ObjectId | ref: Segment |
| channel | String | Email \| SMS \| WhatsApp \| Push |
| offer | String | |
| objective | String | |
| message | String | required, supports `{{name}}` |
| status | String | draft \| scheduled \| running \| completed \| failed \| paused |
| scheduledAt | Date | |
| launchedAt | Date | |
| completedAt | Date | |
| isAbTest | Boolean | |
| variants | [Variant] | name, message, weight, stats |
| stats.audienceSize | Number | |
| stats.sent | Number | |
| stats.delivered | Number | |
| stats.failed | Number | |
| stats.opened | Number | |
| stats.read | Number | |
| stats.clicked | Number | |
| stats.converted | Number | |
| stats.revenue | Number | INR |
| aiGenerated | Boolean | |
| aiReasoning | String | |
| createdBy | ObjectId | ref: User |
| createdAt | Date | |
| updatedAt | Date | |

**Indexes:** `status`, compound `(status, createdAt desc)`

---

## communications

| Field | Type | Notes |
|---|---|---|
| _id | ObjectId | |
| campaign | ObjectId | ref: Campaign |
| customer | ObjectId | ref: Customer |
| variant | String | "A" or "B" for A/B tests |
| channel | String | Email \| SMS \| WhatsApp \| Push |
| message | String | personalized copy |
| status | String | PENDING \| SENT \| DELIVERED \| FAILED \| OPENED \| READ \| CLICKED \| CONVERTED |
| failureReason | String | |
| vendorMessageId | String | assigned by channel service |
| events | [EventLog] | { status, timestamp, meta } — full history |
| sentAt | Date | |
| deliveredAt | Date | |
| openedAt | Date | |
| readAt | Date | |
| clickedAt | Date | |
| convertedAt | Date | |
| revenueGenerated | Number | INR, set on CONVERTED event |
| createdAt | Date | |
| updatedAt | Date | |

**Lifecycle (status rank):**
`PENDING(0) → SENT(1) → DELIVERED(2) → OPENED(3) → READ(4) → CLICKED(5) → CONVERTED(6)`
`FAILED` is terminal from any non-terminal state.
Receipt handler rejects transitions that don't advance the rank.

**Indexes:** `campaign`, `customer`, `status`, `vendorMessageId`, compound `(campaign, status)`

---

## analytics *(optional — unused in current build, schema reserved)*

| Field | Type | Notes |
|---|---|---|
| _id | ObjectId | |
| date | Date | |
| type | String | daily-summary \| campaign-summary |
| campaign | ObjectId | ref: Campaign (for campaign-summary) |
| metrics | Object | totalCustomers, newCustomers, revenue, messagesSent, … |

---

## MessageLog (Channel Service DB)

| Field | Type | Notes |
|---|---|---|
| _id | ObjectId | |
| communicationId | String | matches CRM Communication._id |
| campaignId | String | |
| customerId | String | |
| recipient | String | |
| channel | String | |
| message | String | |
| vendorMessageId | String | |
| statusHistory | [Object] | { status, timestamp, attempt, meta } |
| finalStatus | String | |
| callbackAttempts | Number | |
| callbackSucceeded | Boolean | |
| createdAt | Date | |
| updatedAt | Date | |

**Indexes:** `communicationId`, `vendorMessageId`
