import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
type ApiErrorPayload = {
  error?:
    | string
    | {
        code?: string;
        message?: string;
      };
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";
const FLOWDROP_SOCKET_PROTOCOL = "flowdrop";
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
  return friendlyErrorMessage(undefined, message, fallback);
}

function friendlyErrorMessage(
  code: string | undefined,
  message: string | undefined,
  fallback: string,
) {
  switch (code) {
    case "DEVICE_ID_REQUIRED":
      return "This device could not start sharing. Refresh and try again.";
    case "OTP_INVALID":
      return "Enter the 6-digit code.";
    case "OTP_NOT_FOUND":
      return "That code expired or is no longer valid.";
    case "JOIN_ATTEMPTS_EXCEEDED":
      return "Too many tries for that code. Generate a new one.";
    case "SESSION_ALREADY_PAIRED":
      return "That code has already been used on another device.";
    case "SESSION_NOT_JOINABLE":
      return "That code is no longer available.";
    case "SESSION_ACCESS_DENIED":
    case "ACCESS_TOKEN_REQUIRED":
      return "This session expired or is no longer available on this device.";
    case "RATE_LIMITED":
      return "Too many tries. Wait a moment and try again.";
    case "MESSAGE_EMPTY":
      return "Type a message before sending.";
    case "TEXT_TOO_LARGE":
      return "That message is too long. Split it into smaller parts.";
    case "SESSION_MESSAGE_LIMIT_REACHED":
      return "This chat is full. Start a new session to keep sharing.";
    case "MESSAGE_PERSIST_FAILED":
      return "Your message could not be sent. Try again.";
    case "SESSION_NOT_READY":
      return "The connection is still getting ready. Try again in a moment.";
    case "BAD_EVENT":
      return "Something went wrong with the live connection. Try again.";
    case "INTERNAL_ERROR":
      return "Something went wrong. Try again in a moment.";
    default:
      break;
  }

  if (!message) {
    return fallback;
  }

  if (
    message === "Could not restore session" ||
    message === "Could not connect"
  ) {
    return "This session could not be restored. Start a new one.";
  }

  if (message === "Could not persist message") {
    return "Your message could not be sent. Try again.";
  }

  if (message === "Session not ready") {
    return "The connection is still getting ready. Try again in a moment.";
  }

  if (message === "Unsupported event") {
    return "Something went wrong with the live connection. Try again.";
  }

  return message;
}

function apiErrorMessage(payload: ApiErrorPayload, fallback: string) {
  if (typeof payload.error === "string" && payload.error.trim()) {
    return friendlyErrorMessage(undefined, payload.error, fallback);
  }

  if (
    payload.error &&
    typeof payload.error === "object" &&
    ((typeof payload.error.message === "string" &&
      payload.error.message.trim()) ||
      typeof payload.error.code === "string")
  ) {
    return friendlyErrorMessage(
      payload.error.code,
      payload.error.message,
      fallback,
    );
  }

  return fallback;
}

function getWebSocketBaseUrl() {
  const base = API_BASE || window.location.origin;
  return base.replace(/^http/, "ws");
}

export default function App() {
  const [view, setView] = useState<ViewState>("idle");
  const [pairingMode, setPairingMode] = useState<
    "landing" | "receive" | "share"
  >("landing");
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
  const [createPending, setCreatePending] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(
    null,
  );
  const [joinPending, setJoinPending] = useState(false);
  const [deepLinkOtp, setDeepLinkOtp] = useState<string | null>(null);
  const [refreshPending, setRefreshPending] = useState(false);
  const [resetPending, setResetPending] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const errorTimerRef = useRef<number | null>(null);
  const closingSessionRef = useRef(false);
  const deviceId = useMemo(() => getDeviceId(), []);

  useEffect(() => {
    function isStandalone() {
      return (
        window.matchMedia("(display-mode: standalone)").matches ||
        window.matchMedia("(display-mode: window-controls-overlay)").matches ||
        ("standalone" in navigator &&
          Boolean(
            (navigator as Navigator & { standalone?: boolean }).standalone,
          ))
      );
    }

    function handleBeforeInstallPrompt(event: Event) {
      if (isStandalone()) {
        return;
      }

      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    }

    function handleAppInstalled() {
      setInstallPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

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
    const params = new URLSearchParams(window.location.search);
    const scannedOtp = params.get("otp")?.replace(/\D/g, "").slice(0, 6) ?? "";
    const mode = params.get("mode");
    const autoJoin = params.get("autojoin") === "1";

    if (scannedOtp.length === 6) {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      setJoinOtp(formatOtp(scannedOtp));
      setPairingMode(mode === "receive" ? "receive" : "receive");
      if (autoJoin) {
        setDeepLinkOtp(scannedOtp);
      }
    }

    if (params.has("otp") || params.has("mode") || params.has("autojoin")) {
      params.delete("otp");
      params.delete("mode");
      params.delete("autojoin");
      const nextSearch = params.toString();
      const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
      window.history.replaceState({}, "", nextUrl);
    }
  }, []);

  useEffect(() => {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const saved = JSON.parse(raw) as {
        otp?: string;
        otpExpiresAt?: number | null;
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
      if (
        saved.role === "host" &&
        saved.otp &&
        saved.otpExpiresAt &&
        saved.otpExpiresAt > Math.floor(Date.now() / 1000)
      ) {
        setOtp(saved.otp);
        setOtpExpiresAt(saved.otpExpiresAt);
        setPairingMode("share");
      }
      setView("connected");
      setStatusText("Restoring session...");
    } catch {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, []);

  async function readSessionState(
    nextSessionId: string,
    nextAccessToken: string,
  ) {
    const response = await fetch(
      `${API_BASE}/api/session/${nextSessionId}/state`,
      {
        headers: {
          authorization: `Bearer ${nextAccessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error("Could not restore session");
    }

    return (await response.json()) as ApiSessionState;
  }

  function applySessionState(payload: ApiSessionState) {
    setMessages(payload.messages);
    setDeviceCount(payload.connected ? 2 : 1);
    setSessionExpiresAt(payload.sessionExpiresAt);
    setStatusText(
      payload.connected
        ? "Both devices connected"
        : "Waiting for second device",
    );
  }

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
    const currentSessionId = sessionId;
    const currentAccessToken = accessToken;
    const socketUrl = new URL(
      `${getWebSocketBaseUrl()}/api/ws/${currentSessionId}`,
    );
    socketUrl.searchParams.set("deviceId", deviceId);

    async function connect() {
      setErrorText(null);
      const payload = await readSessionState(
        currentSessionId,
        currentAccessToken,
      );
      if (!active) {
        return;
      }

      applySessionState(payload);

      const socket = new WebSocket(socketUrl, [
        FLOWDROP_SOCKET_PROTOCOL,
        `auth.${currentAccessToken}`,
      ]);
      socketRef.current = socket;

      socket.addEventListener("message", (event) => {
        if (!active) {
          return;
        }

        let payload: ServerEvent;
        try {
          payload = JSON.parse(event.data) as ServerEvent;
        } catch {
          setErrorText(
            "Received an invalid live update. Reconnect and try again.",
          );
          return;
        }
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
          setErrorText(
            friendlyErrorMessage(
              payload.data.code,
              payload.data.message,
              "Something went wrong. Try again.",
            ),
          );
        }
      });

      socket.addEventListener("close", () => {
        if (active) {
          if (closingSessionRef.current) {
            closingSessionRef.current = false;
            return;
          }
          setStatusText("Disconnected");
          setErrorText(
            "Connection lost. Reopen the session or start a new one.",
          );
        }
      });
    }

    connect().catch((error: unknown) => {
      closeSessionLocally();
      setErrorText(friendlyError(error, "This session could not be restored."));
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
        otp: role === "host" ? otp : "",
        otpExpiresAt: role === "host" ? otpExpiresAt : null,
        sessionExpiresAt,
      }),
    );
  }, [accessToken, otp, otpExpiresAt, role, sessionExpiresAt, sessionId]);

  useEffect(() => {
    if (view !== "connected" || !sessionId || !accessToken) {
      return;
    }

    let syncPending = false;
    const currentSessionId = sessionId;
    const currentAccessToken = accessToken;

    async function syncIfVisible() {
      if (document.visibilityState !== "visible" || syncPending) {
        return;
      }

      syncPending = true;
      try {
        const payload = await readSessionState(
          currentSessionId,
          currentAccessToken,
        );
        applySessionState(payload);
      } catch {
        // ponytail: keep the stale-view fix cheap; explicit button still handles user recovery.
      } finally {
        syncPending = false;
      }
    }

    document.addEventListener("visibilitychange", syncIfVisible);
    window.addEventListener("focus", syncIfVisible);

    return () => {
      document.removeEventListener("visibilitychange", syncIfVisible);
      window.removeEventListener("focus", syncIfVisible);
    };
  }, [accessToken, sessionId, view]);

  async function createSession() {
    if (createPending) {
      return;
    }

    setCreatePending(true);
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
      setPairingMode("share");
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
    } finally {
      setCreatePending(false);
    }
  }

  const joinSessionWithOtp = useCallback(
    async (nextOtp: string) => {
      if (joinPending) {
        return;
      }

      setJoinPending(true);
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
            otp: nextOtp.replace(/\D/g, ""),
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
      } finally {
        setJoinPending(false);
      }
    },
    [deviceId, joinPending],
  );

  async function joinSession() {
    await joinSessionWithOtp(joinOtp);
  }

  useEffect(() => {
    if (!deepLinkOtp || joinPending || view === "connected" || sessionId) {
      return;
    }

    setDeepLinkOtp(null);
    void joinSessionWithOtp(deepLinkOtp);
  }, [deepLinkOtp, joinPending, joinSessionWithOtp, sessionId, view]);

  async function refreshSession() {
    if (refreshPending || !sessionId || !accessToken) {
      return;
    }

    const currentSessionId = sessionId;
    const currentAccessToken = accessToken;
    setRefreshPending(true);
    setErrorText(null);

    try {
      const payload = await readSessionState(
        currentSessionId,
        currentAccessToken,
      );
      applySessionState(payload);

      if (!payload.connected) {
        setErrorText(
          "Still waiting for the other device to finish connecting.",
        );
      }
    } catch (error: unknown) {
      setErrorText(friendlyError(error, "Could not refresh this session."));
    } finally {
      setRefreshPending(false);
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
    if (resetPending) {
      return;
    }

    setResetPending(true);
    if (!sessionId || !accessToken) {
      closeSessionLocally();
      setResetPending(false);
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/session/${sessionId}/reset`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        const payload = (await response
          .json()
          .catch(() => null)) as ApiErrorPayload | null;
        throw new Error(
          apiErrorMessage(payload ?? {}, "Could not end this session."),
        );
      }
    } catch {
      setErrorText("Could not end this session. Try again in a moment.");
      setResetPending(false);
      return;
    }

    closeSessionLocally();
    setResetPending(false);
  }

  async function triggerInstall() {
    if (!installPrompt) {
      setErrorText("Install option is not available in this browser yet.");
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setInstallPrompt(null);
    }
  }

  const shouldShowSessionFeature =
    view === "connected" &&
    sessionId &&
    accessToken &&
    (deviceCount >= 2 || role === "peer" || (role === "host" && !otp));
  const pairingScreenMode =
    pairingMode === "share" && otp
      ? "share"
      : pairingMode === "receive"
        ? "receive"
        : "landing";
  const qrJoinUrl =
    pairingScreenMode === "share" && otp
      ? new URL(
          `/?mode=receive&otp=${otp.replace(/\s/g, "")}&autojoin=1`,
          window.location.origin,
        ).toString()
      : null;
  const showInstallChip =
    Boolean(installPrompt) &&
    !shouldShowSessionFeature &&
    pairingScreenMode === "landing";
  return (
    <AppShell
      onInstall={() => void triggerInstall()}
      showInstall={showInstallChip}
    >
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
          onRefreshSession={refreshSession}
          onReset={resetSession}
          onSend={sendText}
          paired={deviceCount >= 2}
          refreshPending={refreshPending}
          resetPending={resetPending}
          sessionExpiresAt={sessionExpiresAt}
          statusText={statusText}
        />
      ) : (
        <PairingFeature
          backPending={pairingScreenMode === "share" && resetPending}
          createPending={createPending}
          errorText={null}
          joinPending={joinPending}
          joinOtp={joinOtp}
          mode={pairingScreenMode}
          onBack={() => {
            if (pairingScreenMode === "share") {
              void resetSession();
              return;
            }
            setPairingMode("landing");
          }}
          onCreateSession={createSession}
          onRefreshSession={refreshSession}
          onJoinOtpChange={setJoinOtp}
          onJoinSession={joinSession}
          onSelectReceive={() => setPairingMode("receive")}
          otp={otp}
          otpExpiresAt={otpExpiresAt}
          qrJoinUrl={qrJoinUrl}
          refreshPending={refreshPending}
          statusText={statusText}
        />
      )}
    </AppShell>
  );
}
