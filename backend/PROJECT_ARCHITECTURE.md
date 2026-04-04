# The War Room — Backend Architecture

## 1. Overview

Central AI Gateway backend serving multiple mobile apps. Handles AI chat via Vertex AI Gemini 2.5 Flash, subscription verification via Google Play, rate limiting via Upstash Redis, and user management via Firebase + Firestore.

**Apps served:** deScroll (Android), future apps via the same API.

## 2. Tech Stack

| Component     | Technology                                                |
| ------------- | --------------------------------------------------------- |
| Runtime       | Node.js 20+ (TypeScript, Express 5)                       |
| Hosting       | Google Cloud Run (auto-scaling container)                 |
| Auth          | Firebase Admin SDK (JWT verification)                     |
| Database      | Firestore (Native mode)                                   |
| AI Model      | Vertex AI — Gemini 2.5 Flash (standard mode, no thinking) |
| Rate Limiting | Upstash Redis (daily counters per user/app)               |
| Secrets       | Google Secret Manager (all secrets loaded at startup)     |
| Container     | Docker (multi-stage build, non-root user)                 |

## 3. Folder Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── firebase.ts        — Firebase Admin SDK init + Firestore/Auth getters
│   │   ├── redis.ts           — Upstash Redis client init + connection verify
│   │   ├── vertexai.ts        — Vertex AI Gemini 2.5 Flash setup (standard mode)
│   │   ├── secrets.ts         — Google Secret Manager loader (startup fetch)
│   │   └── configCache.ts     — 5-min in-memory cache for config/global document
│   ├── middleware/
│   │   ├── requestLogger.ts   — UUID request-id, JSON structured logs, duration tracking
│   │   ├── appVerify.ts       — x-app-id + SHA-256 x-app-secret verification
│   │   ├── authMiddleware.ts  — Firebase JWT Bearer token verification + ban check
│   │   ├── killSwitch.ts      — Global AI disable check from cached config (chat only)
│   │   ├── rateLimiter.ts     — Redis daily counter check + plan limit enforcement
│   │   └── errorHandler.ts    — Generic error responses (never expose internals)
│   ├── routes/
│   │   ├── user.ts            — POST /api/user/register
│   │   ├── chat.ts            — POST /api/chat (full AI flow)
│   │   ├── subscription.ts    — POST /api/subscription/verify + GET /api/subscription/status
│   │   └── admin.ts           — GET dashboard/users/usage + POST ban-user/kill-switch
│   ├── services/
│   │   ├── geminiService.ts   — System prompt builder + chat history + Vertex AI call
│   │   ├── subscriptionService.ts — Google Play purchase verify + Firestore upsert
│   │   └── usageService.ts    — Redis INCR + Firestore atomic usage tracking + cost calc
│   ├── types/index.ts         — All TypeScript interfaces and constants
│   ├── app.ts                 — Express setup, middleware, route mounting
│   └── server.ts              — Entry point, startup sequence, graceful shutdown
├── Dockerfile                 — Multi-stage build, non-root user, port 8080
├── .dockerignore
├── .gitignore
├── .eslintrc.json
├── tsconfig.json
└── package.json
```

## 4. Startup Flow

```
server.ts
  ├── loadSecrets()      → Fetch UPSTASH_REDIS_URL, UPSTASH_REDIS_TOKEN, JWT_SECRET from Secret Manager
  ├── initFirebase()     → Initialize Firebase Admin SDK (Application Default Credentials)
  ├── initRedis()        → Connect to Upstash Redis, verify with PING
  ├── initVertexAI()     → Initialize Gemini 2.5 Flash model (standard mode, 1024 max tokens)
  └── app.listen(8080)   → Start Express server
```

Graceful shutdown on SIGTERM/SIGINT with 10s force-exit timeout.

## 5. Middleware Pipeline

Every request passes through `requestLogger` first. Protected routes then apply middleware in strict order:

```
requestLogger → appVerify → authMiddleware → [killSwitch] → [rateLimiter]
```

- **requestLogger**: Assigns UUID `x-request-id`, logs method/path/status/duration as structured JSON.
- **appVerify**: Reads `x-app-id` + `x-app-secret` headers → looks up `apps` collection → SHA-256 hash compare → attaches `appId` + `appDoc` to request.
- **authMiddleware**: Reads `Authorization: Bearer <token>` → `verifyIdToken()` via Firebase Admin → looks up `users` collection → checks `is_banned` → attaches `decodedToken` + `user`.
- **killSwitch** _(chat only)_: Reads cached `config/global` → if `kill_switch === true`, returns 503.
- **rateLimiter** _(chat only)_: Reads user plan from subscriptions → reads plan limits from cached config → checks Redis counter `rate:{uid}:{appId}:{YYYY-MM-DD}` → 429 if over limit → attaches `planType` + `planLimits`.

## 6. API Endpoints

### User

| Method | Path                 | Middleware       | Description                              |
| ------ | -------------------- | ---------------- | ---------------------------------------- |
| POST   | `/api/user/register` | appVerify → auth | Create/update user document in Firestore |

### Chat

| Method | Path        | Middleware                                  | Description       |
| ------ | ----------- | ------------------------------------------- | ----------------- |
| POST   | `/api/chat` | appVerify → auth → killSwitch → rateLimiter | Full AI chat flow |

**Request body:**

```json
{
  "message": "string (max 1000 chars)",
  "sessionId": "string (UUID)",
  "context": { "optional analytics object" }
}
```

**Response:**

```json
{
  "success": true,
  "response": "AI response text",
  "usage": {
    "messagesUsedToday": 12,
    "dailyLimit": 50,
    "remaining": 38,
    "plan": "monthly"
  }
}
```

### Subscription

| Method | Path                       | Middleware       | Description                             |
| ------ | -------------------------- | ---------------- | --------------------------------------- |
| POST   | `/api/subscription/verify` | appVerify → auth | Verify Google Play purchase server-side |
| GET    | `/api/subscription/status` | appVerify → auth | Get user's active plan                  |

### Admin

| Method | Path                     | Middleware             | Description                       |
| ------ | ------------------------ | ---------------------- | --------------------------------- |
| GET    | `/api/admin/dashboard`   | adminAuth (JWT_SECRET) | Total users, active subscriptions |
| GET    | `/api/admin/users`       | adminAuth              | List users with filters           |
| GET    | `/api/admin/usage`       | adminAuth              | AI usage stats with filters       |
| POST   | `/api/admin/ban-user`    | adminAuth              | Ban a user                        |
| POST   | `/api/admin/kill-switch` | adminAuth              | Enable/disable AI globally        |

### Health

| Method | Path      | Middleware | Description                        |
| ------ | --------- | ---------- | ---------------------------------- |
| GET    | `/health` | none       | Returns status, version, timestamp |

## 7. Firestore Collections

| Collection      | Document ID                  | Key Fields                                                                                                 |
| --------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `apps`          | app_id (e.g. "descroll")     | app_name, secret_hash, platform, is_active                                                                 |
| `users`         | Firebase UID                 | uid, app_id, email, is_banned, created_at, last_seen                                                       |
| `subscriptions` | auto                         | user_id, app_id, plan_type, purchase_token, product_id, status, starts_at, expires_at, raw_google_response |
| `ai_usage`      | `{uid}_{appId}_{YYYY-MM-DD}` | message_count, token_input, token_output, cost_usd                                                         |
| `chat_history`  | auto                         | user_id, app_id, session_id, role, content, tokens_used, created_at                                        |
| `config`        | "global"                     | kill_switch (bool), plans (map with daily_messages + max_context_chars per plan)                           |

## 8. Plan Limits (config/global)

| Plan     | Daily Messages | Max Context Chars |
| -------- | -------------- | ----------------- |
| free     | 5              | 500               |
| monthly  | 50             | 2000              |
| sixmonth | 100            | 3000              |
| yearly   | 300            | 5000              |

## 9. Product ID Mapping

| Play Store Product ID | Backend Plan | Duration |
| --------------------- | ------------ | -------- |
| `premium-monthly`     | monthly      | 30 days  |
| `premium-six-month`   | sixmonth     | 180 days |
| `premium-yearly`      | yearly       | 365 days |

## 10. AI Chat Flow (POST /api/chat)

1. Run middleware: appVerify → auth → killSwitch → rateLimiter
2. Validate: message (required, max 1000), sessionId (required), context (optional)
3. Build system prompt with app name, plan-based word limit, user context (truncated to plan's max_context_chars)
4. Fetch last 10 chat messages from Firestore for conversation memory
5. Call Vertex AI Gemini 2.5 Flash (standard mode, max 1024 output tokens, temp 0.7)
6. INCR Redis rate counter + set midnight IST expiry
7. Atomic Firestore increment on ai_usage (message_count, tokens, cost_usd)
8. Batch save user + assistant messages to chat_history
9. Return response + usage envelope

## 11. Security Model

- All secrets from Google Secret Manager (never in code/repo)
- App identity: SHA-256 hashed secret comparison
- User identity: Firebase JWT verification
- Ban enforcement: checked in authMiddleware
- Admin: separate JWT_SECRET-based auth (not Firebase)
- Error messages: always generic (never expose internals)
- Docker: non-root user in production
- Rate limit: enforced BEFORE AI call (never waste tokens)
- app_id written to every Firestore document

## 12. Cost Controls

- Gemini 2.5 Flash standard mode only (no thinking = ~10x cheaper)
- Max output tokens: 1024
- Context chars limited by plan
- Redis for rate checks (not Firestore reads)
- Config/global cached 5 minutes with stale-if-error fallback
- Cost tracked per request: `(input_tokens/1M * $0.15) + (output_tokens/1M * $0.60)`

## 13. Deployment

- **Docker**: Multi-stage build (builder → production), node:20-alpine, non-root user
- **Port**: 8080 (Cloud Run default)
- **Health check**: GET /health returns 200
- **Startup validation**: Secrets loaded, Firebase/Redis/VertexAI initialized before accepting traffic
