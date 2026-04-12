# The War Room

Central workspace for:

- `backend`: AI gateway API (Express + TypeScript) for app authentication, chat, subscriptions, rate limiting, and admin actions.
- `admin-panel`: Next.js 14 admin dashboard for users, subscriptions, usage, costs, and settings.

## Repository Structure

```text
The-War-Room/
├── backend/
│   ├── src/
│   ├── Dockerfile
│   └── package.json
├── admin-panel/
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── package.json
└── README.md
```

## Tech Stack

### Backend

- Node.js 20+
- TypeScript
- Express 5
- Firebase Admin SDK (Auth + Firestore)
- Vertex AI (Gemini)
- Upstash Redis
- Google Secret Manager

### Admin Panel

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- NextAuth (Google Sign-In)
- Firebase Admin SDK (server-side Firestore reads)
- SWR
- Recharts

## Prerequisites

- Node.js `>= 20`
- npm
- Google Cloud project with Firestore + Secret Manager configured
- Firebase project and service account credentials

## Local Development

### 1) Backend

```bash
cd backend
npm install
npm run dev
```

Useful scripts:

```bash
npm run build
npm run typecheck
npm run lint
npm run lint:fix
npm run format
npm run format:check
```

Notes:

- Backend expects secrets from Google Secret Manager.
- Required secret names:
  - `UPSTASH_REDIS_URL`
  - `UPSTASH_REDIS_TOKEN`
  - `JWT_SECRET`

### 2) Admin Panel

```bash
cd admin-panel
npm install
npm run dev
```

Open: `http://localhost:3000`

Environment setup:

```bash
cp .env.example .env.local
```

Then fill required values in `.env.local`:

- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `BACKEND_BASE_URL`

Optional analytics and Crashlytics env vars for the admin panel:

- `GA4_PROPERTY_ID_DESCROLL`
- `GA4_PROPERTY_ID_SOULLENS`
- `CRASHLYTICS_BIGQUERY_PROJECT_ID`
- `CRASHLYTICS_BIGQUERY_QUERY_PROJECT_ID`
- `CRASHLYTICS_BIGQUERY_DATASET`
- `CRASHLYTICS_SESSIONS_BIGQUERY_DATASET`

## Deployment

### Backend

- Build container with `backend/Dockerfile`
- Deploy to Google Cloud Run

### Admin Panel

- Deploy to Vercel
- Add the same env vars in Vercel project settings

## Security Model (High Level)

- Admin access is role-based (`owner`, `admin`, `viewer`).
- Login is Google Sign-In via NextAuth.
- Firestore reads are server-side only (Firebase Admin SDK).
- Write/moderation actions call backend admin APIs with auth.
- Route protection is enforced via middleware in the admin panel.

## License

Private / internal use.
