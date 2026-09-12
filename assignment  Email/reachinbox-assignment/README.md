# ReachInbox – Full-stack Email Job Scheduler

A production-style assignment implementation using React + TypeScript, Express + TypeScript, PostgreSQL, Redis/BullMQ, Elasticsearch, Ethereal SMTP, Google OAuth and Slack OAuth.

## Architecture

```text
React Dashboard
      |
      v
Express API ---- PostgreSQL (persistent email state)
      |
      +---- Redis <---- BullMQ Queue <---- Worker
      |                                  |
      |                                  +---- Redis-backed rate limiting
      |                                  +---- Ethereal SMTP
      |                                  +---- Elasticsearch indexing
      |                                  +---- Slack notification
      |
      +---- Google OAuth / Slack OAuth
```

## Key decisions

- No cron jobs or cron libraries are used.
- Every email is persisted in PostgreSQL before its BullMQ delayed job is created.
- BullMQ uses Redis-backed delayed jobs, so future jobs survive application restarts.
- Each email has a stable `email-<id>` BullMQ job ID to prevent duplicate queue entries.
- Worker concurrency is configurable with `WORKER_CONCURRENCY`.
- Minimum inter-send delay is configurable with `MIN_DELAY_MS`.
- Hourly rate limiting is implemented with an atomic Redis Lua script per sender/hour window. Jobs are rescheduled rather than dropped.
- A rate-limit hit triggers a real Slack API notification when Slack is connected.
- Email records are indexed in Elasticsearch and can be searched through `/api/emails/search`.
- Bull Board is mounted at `/admin/queues`.

> SMTP providers cannot generally provide an absolute exactly-once guarantee across a network failure occurring after SMTP accepts a message but before the application records success. The implementation uses durable state, stable IDs, and idempotency checks to minimize duplicate sends and documents this trade-off.

## Services

PostgreSQL, Redis, and Elasticsearch run as local services for this setup. The Node API and worker run locally.

## 1. Prerequisites

- Node.js 20+
- npm 10+
- Git
- Google OAuth credentials
- Slack OAuth app credentials
- Ethereal account/credentials

## 2. Start local infrastructure

```bash
# PostgreSQL 17 must be running locally on port 5432.
# Redis 8 must be running locally on port 6379.
# Elasticsearch 8.15.x must be running locally on port 9200.
```

The application does not start Elasticsearch automatically. Docker is optional; on Windows/WSL, run Elasticsearch 8.x locally as a single node with security disabled for this development setup.

Check the services:

```bash
psql -h localhost -p 5432 -U postgres -d reachinbox
redis-cli -h localhost -p 6379 ping
curl http://localhost:9200
```

## 3. Backend

```bash
cd backend
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate deploy
npm run dev
```

In a second terminal:

```bash
cd backend
npm run worker
```

Backend: `http://localhost:4000`

Bull Board: `http://localhost:4000/admin/queues`

## 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:5173`

## Environment

See `backend/.env.example`.

For local development, Google OAuth callback is:

`http://localhost:4000/auth/google/callback`

Slack OAuth callback is:

`http://localhost:4000/auth/slack/callback`

Set the same values in your Google/Slack developer consoles.

## Demo flow

1. Login with Google.
2. Open Compose.
3. Enter subject/body.
4. Upload a CSV containing email addresses.
5. Choose start time, delay and hourly limit.
6. Schedule.
7. Observe delayed jobs in Bull Board.
8. Observe Scheduled Emails.
9. Worker sends through Ethereal.
10. Observe Sent Emails.
11. Stop/restart API and worker before a future job is due; the delayed job remains in Redis and is processed after restart.
12. Set a low hourly limit for a demo and connect Slack. When the limit is reached, a Slack notification is sent and remaining jobs are rescheduled.

## API summary

- `GET /health`
- `GET /auth/google`
- `GET /auth/me`
- `POST /auth/logout`
- `GET /auth/slack`
- `GET /auth/slack/status`
- `POST /auth/slack/disconnect`
- `POST /api/emails/schedule`
- `GET /api/emails?status=scheduled`
- `GET /api/emails?status=sent`
- `GET /api/emails/stats`
- `GET /api/emails/search?q=...`

## Assumptions / trade-offs

- A campaign uses the authenticated user's configured sender email.
- CSV parsing accepts common CSV/text formats and extracts email-looking tokens.
- Ethereal is intentionally used as a fake SMTP provider; generated preview URLs are logged by the worker.
- Slack OAuth tokens are stored in PostgreSQL for the assignment. For a production system they should be encrypted at rest and rotated.
- Slack notifications use the configured `SLACK_CHANNEL_ID` (the channel ID for `#email-notifications`).
- Google OAuth uses a signed session cookie backed by the database.

## Known local limitation

Elasticsearch must be running before indexing and search can be verified. Email sending remains independent of Elasticsearch indexing failures, but `/api/emails/search` returns a controlled temporary-unavailable response when Elasticsearch is down.
