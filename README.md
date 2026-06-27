# FlowDrop

Temporary cross-device sharing for your own devices.

No login. No account. No permanent storage.

The MVP starts smaller than the original idea on purpose:

- Pair two devices with a 6-digit OTP
- Open a real-time text channel
- Auto-expire everything after 1 hour

Files, images, videos, and QR pairing come after text works cleanly.

## Product Shape

FlowDrop is for quick handoff between devices you already control:

- laptop -> phone
- phone -> laptop
- desktop -> tablet

Primary jobs:

- move text
- move links
- move copied snippets
- move notes without chat apps or email

## MVP Scope

Phase 1 is text-only.

Included:

- create temporary session
- show OTP
- join session with OTP
- connect two devices in real time
- send text messages instantly
- persist messages for up to 1 hour
- auto-clean expired sessions and messages

Deferred:

- file uploads
- image/video previews
- R2 object storage
- QR pairing
- multi-device rooms
- share history beyond the session lifetime

## Stack

Frontend:

- React
- Vite
- Tailwind CSS
- Cloudflare Pages

Backend:

- Cloudflare Workers
- Hono
- D1
- Durable Objects
- WebSockets

Not in phase 1:

- R2

## Env And Deploy

Frontend Pages env:

- `VITE_API_BASE_URL=https://your-worker.your-subdomain.workers.dev`

Frontend local env:

- copy [frontend/.env.example](/D:/FlowDrop/frontend/.env.example) to `frontend/.env`
- for local dev you can leave it empty because Vite proxies `/api` to `127.0.0.1:8787`
- set it when the frontend should talk to a deployed Worker

Worker local env:

- copy [worker/.dev.vars.example](/D:/FlowDrop/worker/.dev.vars.example) to `worker/.dev.vars`
- set `SESSION_SECRET` there for local Wrangler dev

Worker production env in Cloudflare:

- plain text variable: `APP_ORIGIN=https://your-pages-domain.pages.dev`
- secret: `SESSION_SECRET`
- D1 binding: `DB`
- Durable Object binding: `PAIRING_SESSION`

Deploy shape:

- Cloudflare Pages deploys `frontend/`
- Cloudflare Worker deploys `worker/`
- Pages does not automatically deploy the separate Worker in this repo

## Architecture Choice

Use each Cloudflare piece for one job:

- D1 stores session rows and temporary messages
- Durable Objects coordinate the live paired session and WebSocket connections
- Worker routes handle OTP creation, join, and message APIs
- Durable Object alarms handle per-session idle or expiry cleanup
- Cron Trigger deletes expired D1 rows every 10 minutes

Why this split:

- Durable Objects are the right coordination point for multiple WebSocket clients and support WebSocket hibernation on Cloudflare
- D1 is enough for simple relational persistence and expiry queries, but should stay out of the live WebSocket hot path
- R2 is unnecessary until file transfer exists

## Repo Docs

- [docs/product-scope.md](/D:/FlowDrop/docs/product-scope.md)
- [docs/system-architecture.md](/D:/FlowDrop/docs/system-architecture.md)
- [docs/api-contract.md](/D:/FlowDrop/docs/api-contract.md)
- [docs/ui-direction.md](/D:/FlowDrop/docs/ui-direction.md)
- [docs/implementation-plan.md](/D:/FlowDrop/docs/implementation-plan.md)

## Proposed Repo Shape

```text
src/
  frontend/
    components/
    pages/
    hooks/
    lib/

  worker/
    index.ts
    routes/
    durable/
    services/
    utils/

database/
  schema.sql
  migrations/

docs/
```

## Initial Data Model

### sessions

- `id TEXT PRIMARY KEY`
- `otp_hash TEXT NOT NULL`
- `created_at INTEGER NOT NULL`
- `otp_expires_at INTEGER NOT NULL`
- `session_expires_at INTEGER NOT NULL`
- `connected INTEGER NOT NULL DEFAULT 0`

### messages

- `id TEXT PRIMARY KEY`
- `session_id TEXT NOT NULL`
- `sender_device_id TEXT NOT NULL`
- `content TEXT NOT NULL`
- `created_at INTEGER NOT NULL`
- `expires_at INTEGER NOT NULL`

## Security Baseline

- never store plain OTP
- hash OTP with server-side secret
- rate-limit OTP join attempts
- cap session to 2 active devices
- expire OTP after 5 minutes
- expire session data after 1 hour
- reject HTML assumptions and treat text as plain content

## References

- Cloudflare recommends Durable Objects for coordinated WebSocket workloads: [Workers best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/)
- Cloudflare WebSocket docs also point coordinated multi-client cases to Durable Objects: [Using the WebSockets API](https://developers.cloudflare.com/workers/examples/websockets/)
- Cron cleanup lives in the Worker `scheduled()` handler: [Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
- Apple's current design language for glass-like surfaces is documented under Liquid Glass and Materials:
  [Liquid Glass overview](https://developer.apple.com/documentation/technologyoverviews/liquid-glass),
  [Adopting Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass),
  [Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
