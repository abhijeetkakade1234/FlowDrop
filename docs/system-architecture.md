# System Architecture

## Goal

Build the smallest production-shaped backend that cleanly supports:

- OTP pairing
- two-device live connection
- real-time text sync
- one-hour expiry

## Service Split

### Frontend

Cloudflare Pages serves the React app.

Responsibilities:

- create session
- join session with OTP
- open session WebSocket
- render connected chat UI
- show expiry countdown

### Worker API

Hono routes handle stateless HTTP work.

Responsibilities:

- `POST /api/session/create`
- `POST /api/session/join`
- `GET /api/session/:id/state`
- `POST /api/message`
- `GET /api/ws/:sessionId` upgrade handoff

### Durable Object

One Durable Object per session.

Responsibilities:

- hold up to 2 active WebSocket connections
- broadcast text events
- publish device join/leave events
- track last activity
- enforce room-level expiry or idle timeout with alarms
- keep live session coordination out of D1 polling

Why:

- Cloudflare explicitly recommends Durable Objects for coordinated WebSockets
- WebSocket hibernation keeps connections alive better than plain Worker upgrades

### D1

D1 is the source of truth for temporary persisted state.

Responsibilities:

- sessions table
- messages table
- OTP lookup and expiry validation
- reconnect bootstrap for recent text messages

D1 does not do live coordination. That stays in the Durable Object. The hot path is:

- validate in Worker
- coordinate in Durable Object
- persist to D1

## Pairing Flow

### Create session

1. Worker creates `sessionId`
2. Worker generates a 6-digit OTP with secure randomness
3. Worker hashes OTP with `SESSION_SECRET`
4. Worker stores session row in D1
5. Worker returns plain OTP to device A

### Join session

1. Device B submits OTP
2. Worker hashes submitted OTP with the same secret
3. Worker looks up unexpired matching session
4. Worker rejects if session is expired, connected, or already full
5. Worker marks session as connected in D1
6. Both devices open the session WebSocket

## WebSocket Shape

Use the Worker only as the upgrade entry point.

The actual live room lives in the session Durable Object.

Suggested event contract:

```json
{
  "type": "TEXT_MESSAGE",
  "data": {
    "id": "msg_uuid",
    "text": "hello",
    "createdAt": 1750780000
  }
}
```

Other events:

- `SESSION_READY`
- `DEVICE_CONNECTED`
- `DEVICE_LEFT`
- `ERROR`

## Persistence Rules

- store every text message in D1 before broadcast acknowledgement
- keep only 1 hour of message history
- on reconnect, fetch recent messages from D1 instead of trusting in-memory DO state

## Expiry Model

Two clocks:

- OTP expires after 5 minutes
- session data expires after 1 hour

Durable Object alarms:

- close idle or expired live sessions without waiting for global cron

Cron Trigger:

- runs every 10 minutes
- deletes expired messages
- deletes expired sessions

Phase 1 has no R2 cleanup because phase 1 has no file storage.

## Schema

### sessions

```sql
id TEXT PRIMARY KEY,
otp_hash TEXT NOT NULL,
created_at INTEGER NOT NULL,
otp_expires_at INTEGER NOT NULL,
session_expires_at INTEGER NOT NULL,
connected INTEGER NOT NULL DEFAULT 0
```

### messages

```sql
id TEXT PRIMARY KEY,
session_id TEXT NOT NULL,
sender_device_id TEXT NOT NULL,
content TEXT NOT NULL,
created_at INTEGER NOT NULL,
expires_at INTEGER NOT NULL
```

## Security Notes

- never store raw OTP
- use `crypto.getRandomValues()` or `crypto.randomUUID()` based helpers, not `Math.random()`
- rate-limit join attempts per IP and per OTP window
- keep text as text, not trusted markup
- cap room membership to two clients

## What We Are Deferring

Phase 2 can add:

- R2 object uploads
- file metadata table
- upload progress events
- content-type allowlist
- signed download flow

That is a separate complexity wall. Skip it until text works.
