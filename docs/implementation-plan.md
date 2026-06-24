# Implementation Plan

## Phase 0

Set up the repo properly.

- Vite React frontend
- Worker app with Hono
- shared TypeScript config where useful
- Tailwind
- Wrangler config
- D1 local schema

## Phase 1

Ship the text loop.

### Backend

- create session route
- join session route
- session Durable Object
- WebSocket upgrade route
- message persistence route
- cron cleanup

### Frontend

- home page
- OTP creation card
- OTP join form
- connected chat screen
- timer
- connection states

### Done means

- two browser windows can pair
- text sync is live
- refresh can restore from D1
- expired sessions stop working

## Phase 2

Harden the MVP.

- rate limiting
- error states
- reconnect behavior
- mobile polish
- reduced motion pass
- lightweight logging

## Phase 3

Only after text feels good:

- file uploads
- R2 metadata
- object cleanup
- content-type allowlist
- image preview
- progress UI

## Build Order

1. database schema
2. session create/join API
3. session Durable Object
4. WebSocket join flow
5. text send and persist
6. basic frontend UI
7. cleanup cron
8. polish

## Non-Goals Right Now

- over-designed abstractions
- generic plugin system
- optimistic support for every share type
- perfect multi-room architecture

## First Code Pass Checklist

- generate secure OTP
- hash OTP with secret
- store expiry timestamps as epoch seconds
- make one DO instance per session
- keep max 2 live sockets
- persist text before fanout confirmation
- expose a reconnect state endpoint
- add one cleanup handler
