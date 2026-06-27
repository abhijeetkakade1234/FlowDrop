import { Hono } from "hono";
import type { Context } from "hono";
import { PairingSession } from "./pairing-session";

const app = new Hono<{ Bindings: Env }>();
const MAX_JOIN_ATTEMPTS = 8;
const CREATE_RATE_LIMIT = {
  scope: "session_create",
  maxHits: 12,
  windowSeconds: 600,
};
const JOIN_RATE_LIMIT = {
  scope: "session_join",
  maxHits: 24,
  windowSeconds: 600,
};

type SessionRecord = {
  id: string;
  host_device_id: string;
  peer_device_id: string | null;
  session_expires_at: number;
  connected: number;
};

type SessionAccess = {
  session: SessionRecord;
  role: "host" | "peer";
};

type AppContext = Context<{ Bindings: Env }>;
type JsonBody = Record<string, unknown>;

class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

app.onError((error, c) => {
  if (error instanceof ApiError) {
    return errorResponse(c, error.status, error.code, error.message);
  }

  console.error("worker_error", error);
  return errorResponse(
    c,
    500,
    "INTERNAL_ERROR",
    "Something went wrong. Try again in a moment.",
  );
});

app.use("/api/*", async (c, next) => {
  c.header("access-control-allow-origin", c.env.APP_ORIGIN);
  c.header("access-control-allow-headers", "content-type");
  c.header("access-control-allow-methods", "GET,POST,OPTIONS");

  if (c.req.method === "OPTIONS") {
    return c.body(null, 204);
  }

  return next();
});

app.post("/api/session/create", async (c) => {
  const body = await readJson(c);
  const deviceId = normalizeDeviceId(asOptionalString(body.deviceId));
  await enforceRateLimit(c, clientKey(c, deviceId), CREATE_RATE_LIMIT);

  if (!deviceId) {
    throw new ApiError(
      400,
      "DEVICE_ID_REQUIRED",
      "This device could not start a session.",
    );
  }

  const otp = generateOtp();
  const now = Math.floor(Date.now() / 1000);
  const sessionId = crypto.randomUUID();
  const otpHash = await hashOtp(c.env.SESSION_SECRET, otp);
  const hostToken = generateAccessToken();
  const hostTokenHash = await hashAccessToken(c.env.SESSION_SECRET, hostToken);
  const sessionExpiresAt = now + 3600;

  await c.env.DB.prepare(
    `INSERT INTO sessions (
       id, otp_hash, host_token_hash, host_device_id, created_at, otp_expires_at, session_expires_at, join_attempts, connected
     ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)`,
  )
    .bind(
      sessionId,
      otpHash,
      hostTokenHash,
      deviceId,
      now,
      now + 300,
      sessionExpiresAt,
    )
    .run();

  return c.json({
    sessionId,
    otp,
    accessToken: hostToken,
    otpExpiresIn: 300,
    sessionExpiresIn: 3600,
    sessionExpiresAt,
  });
});

app.post("/api/session/join", async (c) => {
  const body = await readJson(c);
  const otp = asOptionalString(body.otp)?.replace(/\D/g, "") ?? "";
  const deviceId = normalizeDeviceId(asOptionalString(body.deviceId));
  await enforceRateLimit(c, clientKey(c, deviceId), JOIN_RATE_LIMIT);

  if (otp.length !== 6) {
    throw new ApiError(400, "OTP_INVALID", "Enter a valid 6-digit code.");
  }
  if (!deviceId) {
    throw new ApiError(
      400,
      "DEVICE_ID_REQUIRED",
      "This device could not join the session.",
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const otpHash = await hashOtp(c.env.SESSION_SECRET, otp);
  const session = await c.env.DB.prepare(
    `SELECT id, otp_expires_at, session_expires_at, connected, join_attempts
     FROM sessions
     WHERE otp_hash = ?`,
  )
    .bind(otpHash)
    .first<{
      id: string;
      otp_expires_at: number;
      session_expires_at: number;
      connected: number;
      join_attempts: number;
    }>();

  if (
    !session ||
    session.otp_expires_at < now ||
    session.session_expires_at < now
  ) {
    throw new ApiError(
      404,
      "OTP_NOT_FOUND",
      "That code expired or is no longer valid.",
    );
  }

  if (session.join_attempts >= MAX_JOIN_ATTEMPTS) {
    throw new ApiError(
      429,
      "JOIN_ATTEMPTS_EXCEEDED",
      "Too many attempts for this code. Create a new one.",
    );
  }

  if (session.connected) {
    throw new ApiError(
      409,
      "SESSION_ALREADY_PAIRED",
      "That session is already connected.",
    );
  }

  const peerToken = generateAccessToken();
  const peerTokenHash = await hashAccessToken(c.env.SESSION_SECRET, peerToken);
  const updateResult = await c.env.DB.prepare(
    `UPDATE sessions
     SET connected = 1,
         peer_token_hash = ?,
         peer_device_id = ?,
         join_attempts = join_attempts + 1
     WHERE id = ? AND connected = 0 AND otp_expires_at >= ? AND session_expires_at >= ?`,
  )
    .bind(peerTokenHash, deviceId, session.id, now, now)
    .run();

  if ((updateResult.meta?.changes ?? 0) !== 1) {
    throw new ApiError(
      409,
      "SESSION_NOT_JOINABLE",
      "That session is no longer available.",
    );
  }

  return c.json({
    success: true,
    sessionId: session.id,
    sessionExpiresAt: session.session_expires_at,
    accessToken: peerToken,
  });
});

app.get("/api/session/:sessionId/state", async (c) => {
  const access = await authenticateSessionAccess(c);
  if ("error" in access) {
    return access.error;
  }

  const { session } = access;
  const sessionId = session.id;

  const messages = await c.env.DB.prepare(
    `SELECT id, sender_device_id, content, created_at
     FROM messages
     WHERE session_id = ?
     ORDER BY created_at ASC
     LIMIT 100`,
  )
    .bind(sessionId)
    .all<{
      id: string;
      sender_device_id: string;
      content: string;
      created_at: number;
    }>();

  return c.json({
    sessionId,
    connected: session.connected === 1,
    sessionExpiresAt: session.session_expires_at,
    messages: messages.results.map((message) => ({
      id: message.id,
      senderDeviceId: message.sender_device_id,
      text: message.content,
      createdAt: message.created_at,
    })),
  });
});

app.post("/api/message", async (c) => {
  const body = await readJson(c);
  const requestedSessionId =
    asOptionalString(body.sessionId) ?? c.req.query("sessionId");
  const access = await authenticateSessionAccess(c, requestedSessionId);
  if ("error" in access) {
    return access.error;
  }

  const sessionId = access.session.id;
  const senderDeviceId = asOptionalString(body.senderDeviceId) ?? "";
  const text = asOptionalString(body.text)?.trim() ?? "";

  if (!sessionId || !senderDeviceId || !text) {
    throw new ApiError(
      400,
      "MESSAGE_INVALID",
      "Enter some text before sending.",
    );
  }
  if (!isAuthorizedDevice(access.session, access.role, senderDeviceId)) {
    throw new ApiError(
      403,
      "DEVICE_MISMATCH",
      "This device is not allowed to use that session.",
    );
  }

  const stub = getPairingStub(c.env, sessionId);
  const result = await stub.submitText(sessionId, senderDeviceId, text);
  if (!result.ok) {
    return errorResponse(c, result.status, result.code, result.message);
  }

  const message = result.message;
  return c.json({
    success: true,
    messageId: message.id,
    createdAt: message.createdAt,
  });
});

app.post("/api/session/:sessionId/reset", async (c) => {
  const access = await authenticateSessionAccess(c);
  if ("error" in access) {
    return access.error;
  }

  const stub = getPairingStub(c.env, access.session.id);
  await stub.closeSession(
    access.role === "host"
      ? access.session.host_device_id
      : (access.session.peer_device_id ?? ""),
  );

  await c.env.DB.prepare("DELETE FROM messages WHERE session_id = ?")
    .bind(access.session.id)
    .run();
  await c.env.DB.prepare("DELETE FROM sessions WHERE id = ?")
    .bind(access.session.id)
    .run();

  return c.json({ success: true });
});

app.get("/api/ws/:sessionId", async (c) => {
  const access = await authenticateSessionAccess(c);
  if ("error" in access) {
    return access.error;
  }

  const { session, role } = access;
  const sessionId = session.id;
  const deviceId = c.req.query("deviceId") ?? "";
  if (!isAuthorizedDevice(session, role, deviceId)) {
    return new Response("Device mismatch", { status: 403 });
  }

  const requestUrl = new URL(c.req.url);
  const forwardUrl = new URL("https://pairing-session/ws");
  forwardUrl.search = requestUrl.search;
  forwardUrl.searchParams.set("sessionId", sessionId);
  forwardUrl.searchParams.set("role", role);
  forwardUrl.searchParams.set(
    "sessionExpiresAt",
    String(session.session_expires_at),
  );

  const stub = getPairingStub(c.env, sessionId);
  return stub.fetch(new Request(forwardUrl, c.req.raw));
});

export default {
  fetch: app.fetch,
  scheduled: async (
    _event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext,
  ) => {
    const now = Math.floor(Date.now() / 1000);
    ctx.waitUntil(
      env.DB.prepare("DELETE FROM messages WHERE expires_at <= ?")
        .bind(now)
        .run(),
    );
    ctx.waitUntil(
      env.DB.prepare("DELETE FROM rate_limits WHERE expires_at <= ?")
        .bind(now)
        .run(),
    );
    ctx.waitUntil(
      env.DB.prepare("DELETE FROM sessions WHERE session_expires_at <= ?")
        .bind(now)
        .run(),
    );
  },
};

export { PairingSession };

function generateOtp() {
  const value = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return value.toString().padStart(6, "0");
}

function generateAccessToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashOtp(secret: string, otp: string) {
  const data = new TextEncoder().encode(`${secret}:${otp}`);
  return hashHex(data);
}

async function hashAccessToken(secret: string, token: string) {
  const data = new TextEncoder().encode(`${secret}:${token}`);
  return hashHex(data);
}

async function hashHex(data: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function getPairingStub(env: Env, sessionId: string) {
  const id = env.PAIRING_SESSION.idFromName(sessionId);
  return env.PAIRING_SESSION.get(id);
}

function normalizeDeviceId(value: string | undefined) {
  const deviceId = value?.trim() ?? "";
  if (!deviceId || deviceId.length > 128) {
    return null;
  }
  return deviceId;
}

function extractBearerToken(headerValue: string | undefined | null) {
  if (!headerValue) {
    return null;
  }

  const [scheme, token] = headerValue.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }
  return token;
}

async function authenticateSessionAccess(
  c: AppContext,
  requestedSessionId?: string | null,
) {
  const sessionId = requestedSessionId ?? c.req.param("sessionId");
  const token =
    c.req.query("accessToken") ??
    extractBearerToken(c.req.header("authorization"));
  if (!sessionId) {
    return {
      error: errorResponse(
        c,
        400,
        "SESSION_ID_REQUIRED",
        "Missing session id.",
      ),
    };
  }

  if (!token) {
    return {
      error: errorResponse(
        c,
        401,
        "ACCESS_TOKEN_REQUIRED",
        "Missing session access token.",
      ),
    };
  }

  const tokenHash = await hashAccessToken(c.env.SESSION_SECRET, token);
  const session = await c.env.DB.prepare(
    `SELECT id, host_device_id, peer_device_id, session_expires_at, connected,
            CASE
              WHEN host_token_hash = ? THEN 'host'
              WHEN peer_token_hash = ? THEN 'peer'
              ELSE NULL
            END AS role
     FROM sessions
     WHERE id = ? AND session_expires_at >= ?`,
  )
    .bind(tokenHash, tokenHash, sessionId, Math.floor(Date.now() / 1000))
    .first<SessionRecord & { role: "host" | "peer" | null }>();

  if (!session || !session.role) {
    return {
      error: errorResponse(
        c,
        403,
        "SESSION_ACCESS_DENIED",
        "This session is no longer available on this device.",
      ),
    };
  }

  return {
    session,
    role: session.role,
  } satisfies SessionAccess;
}

function isAuthorizedDevice(
  session: SessionRecord,
  role: "host" | "peer",
  deviceId: string,
) {
  return role === "host"
    ? session.host_device_id === deviceId
    : session.peer_device_id === deviceId;
}

function errorResponse(
  c: AppContext,
  status: number,
  code: string,
  message: string,
) {
  return new Response(
    JSON.stringify({
      error: {
        code,
        message,
      },
    }),
    {
      status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "access-control-allow-origin": c.env.APP_ORIGIN,
        "access-control-allow-headers": "content-type",
        "access-control-allow-methods": "GET,POST,OPTIONS",
      },
    },
  );
}

async function readJson(c: AppContext): Promise<JsonBody> {
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError(400, "INVALID_JSON", "Send a valid request body.");
  }

  return body as JsonBody;
}

function asOptionalString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function clientKey(c: AppContext, deviceId: string | null) {
  const ip =
    c.req.header("cf-connecting-ip") ??
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  return `${ip}:${deviceId ?? "no-device"}`;
}

async function enforceRateLimit(
  c: AppContext,
  key: string,
  limit: { scope: string; maxHits: number; windowSeconds: number },
) {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - (now % limit.windowSeconds);
  const current = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(hits), 0) AS total
     FROM rate_limits
     WHERE scope = ? AND client_key = ? AND window_start >= ?`,
  )
    .bind(limit.scope, key, windowStart)
    .first<{ total: number | string }>();

  const total = Number(current?.total ?? 0);
  if (total >= limit.maxHits) {
    throw new ApiError(
      429,
      "RATE_LIMITED",
      "Too many attempts. Wait a bit and try again.",
    );
  }

  await c.env.DB.prepare(
    `INSERT INTO rate_limits (scope, client_key, window_start, hits, expires_at)
     VALUES (?, ?, ?, 1, ?)
     ON CONFLICT(scope, client_key, window_start)
     DO UPDATE SET hits = hits + 1`,
  )
    .bind(limit.scope, key, windowStart, windowStart + limit.windowSeconds)
    .run();
}
