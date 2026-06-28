# API Contract

## Principles

- JSON over HTTP for setup flows
- WebSocket for live events
- small surface area

## `POST /api/session/create`

Creates a temporary session and returns the OTP.

Response:

```json
{
  "sessionId": "uuid",
  "otp": "492831",
  "otpExpiresIn": 300,
  "sessionExpiresIn": 3600
}
```

## `POST /api/session/join`

Request:

```json
{
  "otp": "492831"
}
```

Response:

```json
{
  "success": true,
  "sessionId": "uuid"
}
```

Failure cases:

- invalid OTP
- expired OTP
- session full
- session expired

## `GET /api/session/:sessionId/state`

Used after refresh or reconnect.

Response:

```json
{
  "sessionId": "uuid",
  "connected": true,
  "sessionExpiresAt": 1750783600,
  "messages": [
    {
      "id": "msg_uuid",
      "text": "hello",
      "createdAt": 1750780000,
      "senderDeviceId": "device_a"
    }
  ]
}
```

## `POST /api/message`

This exists as the durable persistence endpoint for clients that are already paired.

Request:

```json
{
  "sessionId": "uuid",
  "senderDeviceId": "device_a",
  "text": "hello"
}
```

Response:

```json
{
  "success": true,
  "messageId": "msg_uuid",
  "createdAt": 1750780000
}
```

Notes:

- keep payload plain text
- impose a sane text size cap even if "unlimited messages" stays true
- the Worker can persist then fan out through the session Durable Object

## `GET /api/ws/:sessionId`

WebSocket upgrade endpoint.

The Worker resolves the session Durable Object and hands off the upgrade there.

## WebSocket Events

### Client -> server

```json
{
  "type": "SEND_TEXT",
  "data": {
    "text": "hello"
  }
}
```

### Server -> client

`SESSION_READY`

```json
{
  "type": "SESSION_READY",
  "data": {
    "sessionId": "uuid",
    "sessionExpiresAt": 1750783600
  }
}
```

`TEXT_MESSAGE`

```json
{
  "type": "TEXT_MESSAGE",
  "data": {
    "id": "msg_uuid",
    "text": "hello",
    "createdAt": 1750780000,
    "senderDeviceId": "device_a"
  }
}
```

`DEVICE_CONNECTED`

```json
{
  "type": "DEVICE_CONNECTED",
  "data": {
    "deviceCount": 2
  }
}
```

`DEVICE_LEFT`

```json
{
  "type": "DEVICE_LEFT",
  "data": {
    "deviceCount": 1
  }
}
```

`ERROR`

```json
{
  "type": "ERROR",
  "data": {
    "code": "SESSION_EXPIRED",
    "message": "Session expired"
  }
}
```

## Phase 2 Planned Additions

Single image only for the first media pass.

Planned behavior:

- the `+` action in session opens a share picker
- the user selects one image
- FlowDrop uploads that one image
- the receiving device sees the image inline in the session

Planned constraints:

- one image at a time
- size cap
- image-only content-type allowlist
- same 1-hour expiry model as the session

Multiple images come later.
