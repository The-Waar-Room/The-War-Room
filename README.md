# The War Room

Central workspace for:

- `backend`: AI gateway API (Express + TypeScript) for app authentication, chat, subscriptions, and rate limiting.

## Repository Structure

```text
The-War-Room/
├── backend/
│   ├── src/
│   ├── Dockerfile
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

## Prerequisites

- Node.js `>= 20`
- npm
- Google Cloud project with Firestore + Secret Manager configured
- Firebase project and service account credentials

## Local Development

### Backend

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

## Deployment

### Backend

- Build container with `backend/Dockerfile`
- Deploy to Google Cloud Run

## License

Private / internal use.
