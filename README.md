# SmartCRM - AI-Native Mini CRM

> A production-grade, AI-powered CRM for shopper engagement.

## Live Demo

| Service | URL |
|---|---|
| Frontend | Deploy to Vercel (see below) |
| Backend | Deploy to Render (see below) |
| Channel Service | Deploy to Render (see below) |
| Database | MongoDB Atlas |

**Demo credentials:** `demo@xeno.com` / `demo1234`

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER CLIENT                           │
│           React + Vite + TailwindCSS + Recharts                 │
└───────────────────────┬─────────────────────────────────────────┘
                        │ HTTPS REST (JWT)
┌───────────────────────▼─────────────────────────────────────────┐
│                    CRM BACKEND (Express.js)                      │
│  Auth · Customers · Orders · Segments · Campaigns ·             │
│  Communications · Analytics · AI (Gemini)                       │
└──────┬──────────────────────────────────┬───────────────────────┘
       │ MongoDB Atlas                    │ HTTP (shared API key)
       ▼                                  ▼
┌─────────────┐              ┌────────────────────────────────────┐
│  MongoDB    │              │      CHANNEL SERVICE (Express.js)  │
│  Atlas      │              │  Simulates Email/SMS/WhatsApp/Push │
│             │              │  SENT → DELIVERED → OPENED → …     │
└─────────────┘              │  Async callbacks → /api/comms/receipt
                             └────────────────────────────────────┘
                                          │ Uses Gemini
                             ┌────────────▼───────────┐
                             │  Google Gemini API     │
                             └────────────────────────┘
```

---

## Project Structure

```
smartcrm/
├── backend/               # CRM REST API (Node.js / Express)
│   ├── src/
│   │   ├── config/        # DB + logger
│   │   ├── controllers/   # auth, customers, orders, segments, campaigns, comms, analytics, ai
│   │   ├── middleware/     # auth, errorHandler, validate
│   │   ├── models/        # User, Customer, Order, Segment, Campaign, Communication, Analytics
│   │   ├── routes/        # one file per resource
│   │   ├── seed/          # seed.js – 500 customers, 1500 orders
│   │   ├── services/      # segmentEngine, geminiService, channelClient
│   │   └── server.js
│   ├── .env.example
│   └── package.json
│
├── channel-service/       # Simulated messaging provider (separate Express app)
│   ├── src/
│   │   ├── config/        # DB + logger
│   │   ├── controllers/   # sendController
│   │   ├── middleware/     # auth (shared key), errorHandler
│   │   ├── models/        # MessageLog
│   │   ├── routes/        # channelRoutes
│   │   ├── utils/         # deliverySimulator (async lifecycle events)
│   │   └── server.js
│   ├── .env.example
│   └── package.json
│
├── frontend/              # React SPA
│   ├── src/
│   │   ├── api/           # axios client + endpoint modules
│   │   ├── components/    # common (Badge, Modal, Pagination, StatCard, …) + layout
│   │   ├── context/       # AuthContext, ThemeContext
│   │   ├── pages/         # Dashboard, Customers, Orders, Segments, AIAudienceBuilder,
│   │   │                  # Campaigns, CampaignDetail, AICampaignGenerator, Analytics, MarketingAgent
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   ├── index.html
│   ├── tailwind.config.js
│   └── package.json
│
└── docs/
    ├── api.md             # Full REST API reference
    └── database.md        # Schema documentation
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TailwindCSS, React Router v6, Recharts, Lucide |
| Backend | Node.js, Express.js, Mongoose, Winston, express-validator |
| Database | MongoDB Atlas |
| AI | Google Gemini 1.5 Flash |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Channel Service | Separate Express app, async webhook simulation |
| Deployment | Vercel (frontend), Render (backend + channel service) |

---

## Local Development Setup

### Prerequisites
- Node.js 20+
- npm 9+
- MongoDB Atlas account (free tier is fine)
- Google Gemini API key ([get one free](https://aistudio.google.com/))

### 1. Clone & install

```bash
git clone <repo-url>
cd smartcrm

# Backend
cd backend && npm install && cd ..

# Channel Service
cd channel-service && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..
```

### 2. Environment variables

**Backend (`backend/.env`):**
```
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://...
JWT_SECRET=your-long-random-secret
GEMINI_API_KEY=your-gemini-key
CHANNEL_SERVICE_URL=http://localhost:6000
CHANNEL_SERVICE_API_KEY=supersecret123
CRM_BASE_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5173
```

**Channel Service (`channel-service/.env`):**
```
PORT=6000
NODE_ENV=development
MONGO_URI=mongodb+srv://...  (same cluster, different db name)
CHANNEL_SERVICE_API_KEY=supersecret123
CRM_BASE_URL=http://localhost:5000
```

**Frontend (`frontend/.env`):**
```
VITE_API_BASE_URL=http://localhost:5000/api
```

### 3. Seed the database

```bash
cd backend && npm run seed
```

This creates:
- 1 demo user: `demo@xeno.com` / `demo1234`
- 500 customers across 10 Indian cities, 4 product categories
- 1500 orders with realistic spending patterns
- Customer segments auto-computed (New, Active, Loyal, Premium, At Risk, Inactive, Churned)
- Lead scores calculated per customer

### 4. Start all services

Open **3 terminals**:

```bash
# Terminal 1 – Backend
cd backend && npm run dev

# Terminal 2 – Channel Service
cd channel-service && npm run dev

# Terminal 3 – Frontend
cd frontend && npm run dev
```

Frontend: http://localhost:5173  
Backend API: http://localhost:5000  
Channel Service: http://localhost:6000

---

## Deployment

### MongoDB Atlas
1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a database user with read/write access
3. Allow connections from `0.0.0.0/0` in Network Access
4. Copy the connection string

### Backend → Render

1. Create a new **Web Service** in Render
2. Connect your GitHub repo, set root directory to `backend/`
3. Build command: `npm install`
4. Start command: `npm start`
5. Add all environment variables from `backend/.env.example`
6. After deploy, set `CRM_BASE_URL` to your Render backend URL

### Channel Service → Render

1. Create another **Web Service** in Render
2. Root directory: `channel-service/`
3. Build: `npm install`, Start: `npm start`
4. Set `CRM_BASE_URL` to the backend Render URL
5. Update `CHANNEL_SERVICE_URL` in backend env to this service's URL

### Frontend → Vercel

1. Import the repo into Vercel
2. Set **Root Directory** to `frontend/`
3. Framework preset: `Vite`
4. Add env variable: `VITE_API_BASE_URL=https://your-backend.onrender.com/api`
5. Deploy

### Post-deployment seed

SSH into the backend Render shell or run once locally pointing at Atlas:
```bash
cd backend && npm run seed
```

---

## AI Features

| Feature | Endpoint | Trigger |
|---|---|---|
| Natural language audience builder | `POST /api/ai/audience` | AI Audience Builder page |
| AI message generation | `POST /api/ai/message` | Campaign create modal |
| Full campaign draft generator | `POST /api/ai/campaign-generator` | AI Campaign Generator page |
| Optimization suggestions | `GET /api/ai/optimize/:id` | Campaign detail page |
| Analytics insights | `GET /api/analytics/insights` | Analytics page |
| Marketing Agent (full plan) | `POST /api/ai/agent` | Marketing Agent page + Copilot |

All AI features have graceful fallbacks — they work with heuristics when the Gemini API is unavailable or unconfigured.

---

## Key Design Decisions

- **Segment engine** — rule groups are stored as JSON and converted to MongoDB queries at query time, making them editable and rerunnable without reprocessing historical data.
- **Event ordering protection** — the communication receipt handler uses a rank-based system to reject out-of-order or duplicate webhook events, which are common with async message providers.
- **Fire-and-forget dispatch** — campaign launch responds immediately (202) and runs the per-customer dispatch loop asynchronously in the background, preventing HTTP timeouts on large audiences.
- **Shared API key auth** between CRM backend and channel service keeps inter-service traffic secure without adding OAuth overhead.
- **Graceful AI fallback** — every Gemini call is wrapped in try/catch with a heuristic fallback, so the CRM remains fully functional even without an API key.

---

## Bonus Features Implemented

- ✅ Campaign Scheduling (scheduledAt field + status)
- ✅ A/B Testing (variants with weighted distribution)
- ✅ Customer Lead Scoring (0–100, computed from spend + orders + recency)
- ✅ AI Copilot Sidebar (floating bottom-right, full agent in a drawer)
- ✅ AI Marketing Agent (end-to-end plan: analyze → segment → copy → launch)
- ✅ Dark mode
- ✅ Responsive design (mobile sidebar drawer)
- ✅ Retry logic in channel service callbacks
- ✅ Campaign pause / resume
- ✅ Campaign funnel visualization

---


