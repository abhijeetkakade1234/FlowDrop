import type { FormEvent, KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import {
  UiCircleButton,
  UiModal,
  UiPillButton,
} from "../../../shared/ui/primitives";
import type { SessionFeatureProps } from "../session.types";
import {
  formatMessageTime,
  formatSessionTimeLeft,
  isOwnMessage,
} from "../session.utils";

function CopyIcon() {
  return (
    <svg
      aria-hidden="true"
      className="message-card__copy-icon"
      viewBox="0 0 20 20"
    >
      <rect
        fill="none"
        height="10.5"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
        width="9"
        x="7"
        y="5"
      />
      <path
        d="M5.5 12.5H5A2 2 0 0 1 3 10.5V5a2 2 0 0 1 2-2h5.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg
      aria-hidden="true"
      className="session-thread__back-icon"
      viewBox="0 0 20 20"
    >
      <path
        d="M11.75 4.5 6.25 10l5.5 5.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      aria-hidden="true"
      className="composer-shell__send-icon"
      viewBox="0 0 20 20"
    >
      <path
        d="M3.5 16.5 17 10 3.5 3.5l2.2 5.2L12 10l-6.3 1.3Z"
        fill="currentColor"
      />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg
      aria-hidden="true"
      className="pairing-feature__icon-svg pairing-feature__icon-svg--small"
      viewBox="0 0 20 20"
    >
      <path
        d="M15.4 7.2V3.9m0 3.3h-3.3m2.4-1.4A5.9 5.9 0 1 0 16 10"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function SessionFeature({
  deviceId,
  draft,
  errorText,
  messages,
  onDraftChange,
  onRefreshSession,
  onReset,
  onSend,
  paired,
  refreshPending,
  resetPending,
  sessionExpiresAt,
  statusText,
}: SessionFeatureProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [composerOffset, setComposerOffset] = useState(0);
  const [, setNow] = useState(() => Date.now());
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const input = composerRef.current;
    if (!input) {
      return;
    }

    input.style.height = "0";
    input.style.height = `${Math.min(input.scrollHeight, 220)}px`;
  }, [draft]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) {
      return;
    }
    const activeViewport = viewport;

    function syncComposerOffset() {
      if (window.innerWidth > 720) {
        setComposerOffset(0);
        return;
      }

      const keyboardOffset = Math.max(
        0,
        window.innerHeight - activeViewport.height - activeViewport.offsetTop,
      );
      setComposerOffset(keyboardOffset);
    }

    syncComposerOffset();
    activeViewport.addEventListener("resize", syncComposerOffset);
    activeViewport.addEventListener("scroll", syncComposerOffset);
    window.addEventListener("resize", syncComposerOffset);

    return () => {
      activeViewport.removeEventListener("resize", syncComposerOffset);
      activeViewport.removeEventListener("scroll", syncComposerOffset);
      window.removeEventListener("resize", syncComposerOffset);
    };
  }, []);

  useEffect(() => {
    if (!showLeaveConfirm) {
      return;
    }

    function handleWindowKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setShowLeaveConfirm(false);
      }
    }

    window.addEventListener("keydown", handleWindowKeyDown);
    return () => {
      window.removeEventListener("keydown", handleWindowKeyDown);
    };
  }, [showLeaveConfirm]);

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSend();
    }
  }

  async function handleCopy(messageId: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(messageId);
      window.setTimeout(() => {
        setCopiedId((current) => (current === messageId ? null : current));
      }, 1200);
    } catch {
      setCopiedId(null);
    }
  }

  function handleLeaveClick() {
    if (!resetPending) {
      setShowLeaveConfirm(true);
    }
  }

  function handleLeaveConfirm() {
    setShowLeaveConfirm(false);
    onReset();
  }

  return (
    <section className="session-feature">
      <div className="session-thread">
        <div className="session-thread__body">
          <div className="session-thread__actions">
            <UiCircleButton
              ariaLabel="End connection entirely"
              className="session-thread__leave"
              disabled={resetPending}
              onClick={handleLeaveClick}
              size="md"
            >
              {resetPending ? (
                <span className="session-thread__spinner" aria-hidden="true" />
              ) : (
                <>
                  <BackIcon />
                  <span className="session-thread__leave-label">Back</span>
                </>
              )}
            </UiCircleButton>
          </div>

          <div className="session-feature__day-label">
            Live &bull; {formatSessionTimeLeft(sessionExpiresAt)}
          </div>

          <div className="session-feature__status-rail">
            <div
              aria-label={statusText}
              className="session-feature__status-chip"
              role="status"
              title={statusText}
            >
              <span
                className={
                  paired
                    ? "status-pill__dot status-pill__dot--success"
                    : "status-pill__dot"
                }
              />
            </div>
            <UiCircleButton
              ariaLabel="Check connection"
              className="session-feature__status-action"
              disabled={refreshPending}
              onClick={onRefreshSession}
              size="md"
              title="Check connection"
            >
              {refreshPending ? (
                <span className="session-thread__spinner" aria-hidden="true" />
              ) : (
                <RefreshIcon />
              )}
            </UiCircleButton>
          </div>

          <div className="session-feature__stream">
            {messages.length === 0 ? (
              <div className="session-feature__empty">
                <span className="section-kicker">Start the thread</span>
                <h3>Waiting for the first message</h3>
                <p>
                  Type on one device and it lands on the other one right away.
                </p>
              </div>
            ) : (
              messages.map((message) => {
                const mine = isOwnMessage(message, deviceId);

                return (
                  <article
                    className={`message-card ${mine ? "message-card--mine" : "message-card--peer"}`}
                    key={message.id}
                  >
                    <div
                      className={
                        mine
                          ? "message-pill message-pill--mine"
                          : "message-pill message-pill--peer"
                      }
                    >
                      <div className="message-pill__content">
                        <p>{message.text}</p>
                      </div>
                    </div>

                    <div className="message-card__meta">
                      <span>{formatMessageTime(message.createdAt)}</span>
                      <UiCircleButton
                        ariaLabel="Copy message"
                        className="message-card__copy"
                        onClick={() =>
                          void handleCopy(message.id, message.text)
                        }
                        size="sm"
                        title={copiedId === message.id ? "Copied" : "Copy"}
                        variant="plain"
                      >
                        {copiedId === message.id ? "Copied" : <CopyIcon />}
                      </UiCircleButton>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          <form
            className="composer-shell"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              onSend();
            }}
            style={
              composerOffset > 0
                ? { bottom: `${composerOffset + 12}px` }
                : undefined
            }
          >
            <UiCircleButton
              ariaLabel="More actions"
              className="composer-shell__plus"
              size="md"
              variant="plain"
            >
              +
            </UiCircleButton>
            <textarea
              className="composer-shell__input"
              ref={composerRef}
              onChange={(event) => onDraftChange(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder="Type a message"
              rows={1}
              value={draft}
            />
            <UiCircleButton
              ariaLabel="Send message"
              className="composer-shell__send"
              disabled={!draft.trim()}
              size="md"
              type="submit"
              variant="primary"
            >
              <SendIcon />
            </UiCircleButton>
          </form>
        </div>
      </div>

      {errorText ? <p className="feature-error">{errorText}</p> : null}

      {showLeaveConfirm ? (
        <UiModal
          actions={
            <>
              <UiPillButton
                className="session-thread__modal-cancel"
                onClick={() => setShowLeaveConfirm(false)}
                size="md"
              >
                Cancel
              </UiPillButton>
              <UiPillButton
                className="app-modal__button"
                onClick={handleLeaveConfirm}
                size="md"
                variant="primary"
              >
                End connection
              </UiPillButton>
            </>
          }
          onClose={() => setShowLeaveConfirm(false)}
          title="End connection?"
        >
          This will end the connection entirely on both devices.
        </UiModal>
      ) : null}
    </section>
  );
}
