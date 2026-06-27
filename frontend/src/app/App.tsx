import { useEffect, useMemo, useRef, useState } from "react";
import { PairingFeature } from "../features/pairing/components/PairingFeature";
import { SessionFeature } from "../features/session/components/SessionFeature";
import { formatOtp } from "../features/pairing/pairing.utils";
import type {
  ApiSessionCreate,
  ApiSessionJoin,
  ApiSessionState,
  Message,
  ServerEvent,
} from "../features/session/session.types";
import { AppShell } from "../shared/ui/AppShell";
import "./app.css";

type ViewState = "idle" | "hosting" | "joining" | "connected";
type ApiErrorPayload = {
  error?:
    | string
    | {
        code?: string;
        message?: string;
      };
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";
const SESSION_STORAGE_KEY = "flowdrop.session";
const DEVICE_ID_STORAGE_KEY = "flowdrop.deviceId";

function getDeviceId() {
  const existing = window.sessionStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const created = crypto.randomUUID();
  window.sessionStorage.setItem(DEVICE_ID_STORAGE_KEY, created);
  return created;
}

function friendlyError(error: unknown, fallback: string) {
  if (!(error instanceof Error) || !error.message) {
    return fallback;
  }

  const message = error.message.trim();
  if (message.includes("Unexpected end of JSON input")) {
    return "Could not reach FlowDrop. Try again in a moment.";
  }
  if (message === "Failed to fetch") {
    return "Could not reach FlowDrop. Check that the backend is running.";
  }
  return message;
}

function apiErrorMessage(payload: ApiErrorPayload, fallback: string) {
  if (typeof payload.error === "string" && payload.error.trim()) {
    return payload.error;
  }

  if (
    payload.error &&
    typeof payload.error === "object" &&
    typeof payload.error.message === "string" &&
    payload.error.message.trim()
  ) {
    return payload.error.message;
  }

  return fallback;
}

function getWebSocketBaseUrl() {
  const base = API_BASE || window.location.origin;
  return base.replace(/^http/, "ws");
}

export default function App() {
  const [view, setView] = useState<ViewState>("idle");
  const [pairingMode, setPairingMode] = useState<"landing" | "receive">(
    "landing",
  );
  const [otp, setOtp] = useState("");
  const [joinOtp, setJoinOtp] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [role, setRole] = useState<"host" | "peer" | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [statusText, setStatusText] = useState("Ready");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [sessionClosedNotice, setSessionClosedNotice] = useState<string | null>(
    null,
  );
  const [deviceCount, setDeviceCount] = useState(1);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const errorTimerRef = useRef<number | null>(null);
  const closingSessionRef = useRef(false);
  const deviceId = useMemo(() => getDeviceId(), []);

  useEffect(() => {
    if (!errorText) {
      return;
    }

    if (errorTimerRef.current) {
      window.clearTimeout(errorTimerRef.current);
    }

    errorTimerRef.current = window.setTimeout(() => {
      setErrorText(null);
      errorTimerRef.current = null;
    }, 3200);

    return () => {
      if (errorTimerRef.current) {
        window.clearTimeout(errorTimerRef.current);
        errorTimerRef.current = null;
      }
    };
  }, [errorText]);

  useEffect(() => {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const saved = JSON.parse(raw) as {
        sessionId: string;
        role: "host" | "peer";
        accessToken: string;
        sessionExpiresAt: number;
      };

      if (saved.sessionExpiresAt <= Math.floor(Date.now() / 1000)) {
        window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
        return;
      }

      setSessionId(saved.sessionId);
      setRole(saved.role);
      setAccessToken(saved.accessToken);
      setSessionExpiresAt(saved.sessionExpiresAt);
      setView("connected");
      setStatusText("Restoring session...");
    } catch {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (
      !sessionId ||
      !role ||
      !sessionExpiresAt ||
      !accessToken ||
      view !== "connected"
    ) {
      return;
    }

    let active = true;
    const socketUrl = new URL(`${getWebSocketBaseUrl()}/api/ws/${sessionId}`);
    socketUrl.searchParams.set("accessToken", accessToken);
    socketUrl.searchParams.set("deviceId", deviceId);

    async function connect() {
      setErrorText(null);
      const response = await fetch(
        `${API_BASE}/api/session/${sessionId}/state`,
        {
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Could not restore session");
      }

      const payload = (await response.json()) as ApiSessionState;
      if (!active) {
        return;
      }

      setMessages(payload.messages);
      setDeviceCount(payload.connected ? 2 : 1);
      setSessionExpiresAt(payload.sessionExpiresAt);
      setStatusText("Connecting...");

      const socket = new WebSocket(socketUrl);
      socketRef.current = socket;

      socket.addEventListener("open", () => {
        if (active) {
          setStatusText("Live");
        }
      });

      socket.addEventListener("message", (event) => {
        if (!active) {
          return;
        }

        const payload = JSON.parse(event.data) as ServerEvent;
        if (payload.type === "TEXT_MESSAGE") {
          setMessages((current) => {
            if (current.some((message) => message.id === payload.data.id)) {
              return current;
            }

            return [...current, payload.data];
          });
          return;
        }

        if (
          payload.type === "DEVICE_CONNECTED" ||
          payload.type === "DEVICE_LEFT"
        ) {
          setDeviceCount(payload.data.deviceCount);
          return;
        }

        if (payload.type === "SESSION_READY") {
          setDeviceCount(payload.data.deviceCount);
          setSessionExpiresAt(payload.data.sessionExpiresAt);
          setStatusText(
            payload.data.deviceCount >= 2
              ? "Both devices connected"
              : "Waiting for second device",
          );
          return;
        }

        if (payload.type === "SESSION_CLOSED") {
          if (payload.data.initiatedByDeviceId !== deviceId) {
            setSessionClosedNotice("The other device ended this session.");
          }
          closeSessionLocally();
          return;
        }

        if (payload.type === "ERROR") {
          setErrorText(payload.data.message);
        }
      });

      socket.addEventListener("close", () => {
        if (active) {
          if (closingSessionRef.current) {
            closingSessionRef.current = false;
            return;
          }
          setStatusText("Disconnected");
        }
      });
    }

    connect().catch((error: unknown) => {
      setErrorText(friendlyError(error, "Could not connect"));
      setView("idle");
    });

    return () => {
      active = false;
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [accessToken, deviceId, role, sessionExpiresAt, sessionId, view]);

  useEffect(() => {
    if (!sessionId || !role || !sessionExpiresAt || !accessToken) {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return;
    }

    window.sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        sessionId,
        role,
        accessToken,
        sessionExpiresAt,
      }),
    );
  }, [accessToken, role, sessionExpiresAt, sessionId]);

  async function createSession() {
    setView("hosting");
    setStatusText("Creating session...");
    setErrorText(null);

    try {
      const response = await fetch(`${API_BASE}/api/session/create`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ deviceId }),
      });
      const payload = (await response.json()) as ApiSessionCreate &
        ApiErrorPayload;

      if (!response.ok) {
        throw new Error(apiErrorMessage(payload, "Could not create session"));
      }

      setOtp(formatOtp(payload.otp));
      setOtpExpiresAt(Math.floor(Date.now() / 1000) + payload.otpExpiresIn);
      setSessionId(payload.sessionId);
      setRole("host");
      setAccessToken(payload.accessToken);
      setSessionExpiresAt(payload.sessionExpiresAt);
      setView("connected");
      setStatusText("Waiting for second device");
    } catch (error: unknown) {
      setView("idle");
      setPairingMode("landing");
      setErrorText(friendlyError(error, "Could not create session"));
    }
  }

  async function joinSession() {
    setView("joining");
    setErrorText(null);
    setStatusText("Joining...");

    try {
      const response = await fetch(`${API_BASE}/api/session/join`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          otp: joinOtp.replace(/\s/g, ""),
          deviceId,
        }),
      });

      const payload = (await response.json()) as ApiSessionJoin &
        ApiErrorPayload;
      if (!response.ok || !("sessionId" in payload)) {
        throw new Error(apiErrorMessage(payload, "Could not join session"));
      }

      setOtp("");
      setOtpExpiresAt(null);
      setSessionId(payload.sessionId);
      setRole("peer");
      setAccessToken(payload.accessToken);
      setSessionExpiresAt(payload.sessionExpiresAt);
      setView("connected");
      setStatusText("Connecting...");
    } catch (error: unknown) {
      setView("idle");
      setPairingMode("receive");
      setErrorText(friendlyError(error, "Could not join session"));
    }
  }

  function sendText() {
    const text = draft.trim();
    if (!text || socketRef.current?.readyState !== WebSocket.OPEN) {
      return;
    }

    socketRef.current.send(
      JSON.stringify({
        type: "SEND_TEXT",
        data: { text },
      }),
    );
    setDraft("");
  }

  function closeSessionLocally() {
    closingSessionRef.current = true;
    socketRef.current?.close();
    socketRef.current = null;
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setView("idle");
    setPairingMode("landing");
    setOtp("");
    setJoinOtp("");
    setSessionId(null);
    setRole(null);
    setAccessToken(null);
    setMessages([]);
    setDraft("");
    setStatusText("Ready");
    setErrorText(null);
    setDeviceCount(1);
    setSessionExpiresAt(null);
    setOtpExpiresAt(null);
  }

  async function resetSession() {
    if (!sessionId || !accessToken) {
      closeSessionLocally();
      return;
    }

    try {
      await fetch(`${API_BASE}/api/session/${sessionId}/reset`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });
    } catch {
      // ponytail: best-effort remote reset, local teardown still wins.
    }

    closeSessionLocally();
  }

  const shouldShowSessionFeature =
    view === "connected" &&
    sessionId &&
    accessToken &&
    (deviceCount >= 2 || role === "peer");
  const pairingScreenMode = otp ? "share" : pairingMode;
  return (
    <AppShell>
      {errorText ? <div className="app-snackbar">{errorText}</div> : null}
      {sessionClosedNotice ? (
        <div className="app-modal-backdrop" role="presentation">
          <div
            aria-modal="true"
            className="app-modal glass-window"
            role="dialog"
          >
            <h2>Session ended</h2>
            <p>{sessionClosedNotice}</p>
            <button
              className="primary-liquid-button app-modal__button"
              onClick={() => setSessionClosedNotice(null)}
              type="button"
            >
              OK
            </button>
          </div>
        </div>
      ) : null}
      {shouldShowSessionFeature ? (
        <SessionFeature
          deviceCount={deviceCount}
          deviceId={deviceId}
          draft={draft}
          errorText={null}
          messages={messages}
          onDraftChange={setDraft}
          onReset={resetSession}
          onSend={sendText}
          paired={deviceCount >= 2}
          sessionExpiresAt={sessionExpiresAt}
          statusText={statusText}
        />
      ) : (
        <PairingFeature
          errorText={null}
          joinOtp={joinOtp}
          mode={pairingScreenMode}
          onCreateSession={createSession}
          onJoinOtpChange={setJoinOtp}
          onJoinSession={joinSession}
          onSelectReceive={() => setPairingMode("receive")}
          otp={otp}
          otpExpiresAt={otpExpiresAt}
          statusText={statusText}
        />
      )}
    </AppShell>
  );
}
