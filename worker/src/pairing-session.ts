import { DurableObject } from "cloudflare:workers";

type ClientRole = "host" | "peer";

type Attachment = {
  deviceId: string;
  role: ClientRole;
};

type TextMessage = {
  id: string;
  text: string;
  createdAt: number;
  senderDeviceId: string;
};

type SubmitTextResult =
  | {
      ok: true;
      message: TextMessage;
    }
  | {
      ok: false;
      status: number;
      code: string;
      message: string;
    };

const MAX_TEXT_LENGTH = 20_000;
const MAX_SESSION_MESSAGES = 500;
const SESSION_CLOSED_CODE = 4001;

export class PairingSession extends DurableObject<Env> {
  private sockets = new Map<string, WebSocket>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    ctx.blockConcurrencyWhile(async () => {
      for (const socket of this.ctx.getWebSockets()) {
        const attachment = socket.deserializeAttachment() as Attachment | null;
        if (attachment) {
          this.sockets.set(attachment.deviceId, socket);
        }
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/ws") {
      return this.handleWebSocket(request);
    }

    return new Response("Not found", { status: 404 });
  }

  async submitText(
    sessionId: string,
    senderDeviceId: string,
    text: string,
  ): Promise<SubmitTextResult> {
    const normalizedText = text.trim();
    if (!normalizedText) {
      return {
        ok: false,
        status: 400,
        code: "MESSAGE_EMPTY",
        message: "Enter some text before sending.",
      };
    }

    if (normalizedText.length > MAX_TEXT_LENGTH) {
      return {
        ok: false,
        status: 413,
        code: "TEXT_TOO_LARGE",
        message: "Text is too large. Split it into smaller parts.",
      };
    }

    const countRow = await this.env.DB.prepare(
      `SELECT COUNT(*) AS total
       FROM messages
       WHERE session_id = ?`,
    )
      .bind(sessionId)
      .first<{ total: number | string }>();
    const total = Number(countRow?.total ?? 0);
    if (total >= MAX_SESSION_MESSAGES) {
      return {
        ok: false,
        status: 429,
        code: "SESSION_MESSAGE_LIMIT_REACHED",
        message:
          "This temporary session is full. Start a fresh session to keep sharing.",
      };
    }

    const createdAt = Math.floor(Date.now() / 1000);
    const message = {
      id: crypto.randomUUID(),
      text: normalizedText,
      createdAt,
      senderDeviceId,
    };

    await this.env.DB.prepare(
      `INSERT INTO messages (id, session_id, sender_device_id, content, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        message.id,
        sessionId,
        senderDeviceId,
        normalizedText,
        createdAt,
        createdAt + 3600,
      )
      .run();

    await this.ctx.storage.put("lastActivityAt", createdAt);
    await this.refreshAlarm();
    this.broadcast({
      type: "TEXT_MESSAGE",
      data: message,
    });

    return {
      ok: true,
      message,
    };
  }

  async closeSession(initiatedByDeviceId: string): Promise<void> {
    this.broadcast({
      type: "SESSION_CLOSED",
      data: {
        initiatedByDeviceId,
      },
    });
    // ponytail: tiny flush delay so peers receive the close event before the socket dies.
    await new Promise((resolve) => setTimeout(resolve, 75));

    for (const socket of this.ctx.getWebSockets()) {
      socket.close(SESSION_CLOSED_CODE, "Session closed");
    }
    this.sockets.clear();
    await this.ctx.storage.deleteAll();
  }

  override async alarm(): Promise<void> {
    const sessionExpiresAt =
      (await this.ctx.storage.get<number>("sessionExpiresAt")) ?? 0;
    const lastActivityAt =
      (await this.ctx.storage.get<number>("lastActivityAt")) ?? 0;
    const now = Math.floor(Date.now() / 1000);

    if (now >= sessionExpiresAt || now - lastActivityAt >= 3600) {
      for (const socket of this.ctx.getWebSockets()) {
        socket.close(1000, "Session expired");
      }
      this.sockets.clear();
      await this.ctx.storage.deleteAll();
      return;
    }

    await this.refreshAlarm();
  }

  override webSocketMessage(
    webSocket: WebSocket,
    message: string | ArrayBuffer,
  ): void | Promise<void> {
    if (typeof message !== "string") {
      return;
    }

    const payload = JSON.parse(message) as {
      type?: string;
      data?: { text?: string };
    };
    if (payload.type !== "SEND_TEXT") {
      webSocket.send(
        JSON.stringify({
          type: "ERROR",
          data: {
            code: "BAD_EVENT",
            message: "Unsupported event",
          },
        }),
      );
      return;
    }

    const attachment = webSocket.deserializeAttachment() as Attachment | null;
    const text = payload.data?.text?.trim() ?? "";
    if (!attachment || !text) {
      return;
    }

    void this.ctx.storage.get<string>("sessionId").then((sessionId) => {
      if (sessionId) {
        return this.submitText(sessionId, attachment.deviceId, text)
          .then((result) => {
            if (!result.ok) {
              webSocket.send(
                JSON.stringify({
                  type: "ERROR",
                  data: {
                    code: result.code,
                    message: result.message,
                  },
                }),
              );
            }
          })
          .catch(() => {
            webSocket.send(
              JSON.stringify({
                type: "ERROR",
                data: {
                  code: "MESSAGE_PERSIST_FAILED",
                  message: "Could not persist message",
                },
              }),
            );
          });
      }

      webSocket.send(
        JSON.stringify({
          type: "ERROR",
          data: {
            code: "SESSION_NOT_READY",
            message: "Session not ready",
          },
        }),
      );
      return undefined;
    });
  }

  override async webSocketClose(webSocket: WebSocket): Promise<void> {
    const attachment = webSocket.deserializeAttachment() as Attachment | null;
    if (!attachment) {
      return;
    }

    this.sockets.delete(attachment.deviceId);
    await this.ctx.storage.put("lastActivityAt", Math.floor(Date.now() / 1000));
    this.broadcast({
      type: "DEVICE_LEFT",
      data: {
        deviceCount: this.sockets.size,
      },
    });
  }

  override async webSocketError(webSocket: WebSocket): Promise<void> {
    await this.webSocketClose(webSocket);
  }

  private async handleWebSocket(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const deviceId = url.searchParams.get("deviceId");
    const role = (url.searchParams.get("role") ?? "peer") as ClientRole;
    const sessionId = url.searchParams.get("sessionId");
    const sessionExpiresAt = Number(
      url.searchParams.get("sessionExpiresAt") ?? "0",
    );

    if (!deviceId || !sessionId || (role !== "host" && role !== "peer")) {
      return new Response("Bad request", { status: 400 });
    }

    if (!this.sockets.has(deviceId) && this.sockets.size >= 2) {
      return new Response("Session full", { status: 409 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    server.serializeAttachment({ deviceId, role });
    this.ctx.acceptWebSocket(server);
    this.sockets.set(deviceId, server);

    const now = Math.floor(Date.now() / 1000);
    await this.ctx.storage.put("sessionId", sessionId);
    await this.ctx.storage.put("sessionExpiresAt", sessionExpiresAt);
    await this.ctx.storage.put("lastActivityAt", now);
    await this.refreshAlarm();

    server.send(
      JSON.stringify({
        type: "SESSION_READY",
        data: {
          sessionId,
          sessionExpiresAt,
          deviceCount: this.sockets.size,
        },
      }),
    );

    this.broadcast({
      type: "DEVICE_CONNECTED",
      data: {
        deviceCount: this.sockets.size,
      },
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  private broadcast(payload: unknown) {
    const serialized = JSON.stringify(payload);
    for (const socket of this.ctx.getWebSockets()) {
      socket.send(serialized);
    }
  }

  private async refreshAlarm() {
    const sessionExpiresAt =
      (await this.ctx.storage.get<number>("sessionExpiresAt")) ?? 0;
    if (sessionExpiresAt) {
      await this.ctx.storage.setAlarm(sessionExpiresAt * 1000);
    }
  }
}
