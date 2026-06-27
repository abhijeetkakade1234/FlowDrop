import type { FormEvent, KeyboardEvent } from "react";
import { useState } from "react";
import { LiquidPill } from "../../../shared/ui/liquid/LiquidPrimitives";
import type { SessionFeatureProps } from "../session.types";
import {
  formatMessageTime,
  formatSessionTimeLeft,
  isOwnMessage,
} from "../session.utils";

export function SessionFeature({
  deviceCount,
  deviceId,
  draft,
  errorText,
  messages,
  onDraftChange,
  onReset,
  onSend,
  paired,
  sessionExpiresAt,
  statusText,
}: SessionFeatureProps) {
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  async function copyMessage(messageId: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      window.setTimeout(() => {
        setCopiedMessageId((current) =>
          current === messageId ? null : current,
        );
      }, 1600);
    } catch {
      setCopiedMessageId(null);
    }
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      onSend();
    }
  }

  return (
    <section className="session-feature">
      <LiquidPill className="session-feature__status">
        <span className="status-pill__dot status-pill__dot--success" />
        <span>{paired ? "Connected" : statusText}</span>
        <span className="status-pill__muted">
          Auto deletes in {formatSessionTimeLeft(sessionExpiresAt)}
        </span>
      </LiquidPill>

      <div className="session-workspace glass-window">
        <div className="session-feature__day-label">Today</div>

        <div className="session-feature__stream">
          {messages.length === 0 ? (
            <div className="session-feature__empty">
              <span className="section-kicker">Text-first</span>
              <h3>Waiting for the first drop</h3>
              <p>
                Once both devices are paired, paste or type text here and it
                will appear instantly on the other side.
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
                    <p>{message.text}</p>
                  </div>
                  <div className="message-card__meta">
                    <span>{formatMessageTime(message.createdAt)}</span>
                    <button
                      className="message-card__copy"
                      onClick={() => void copyMessage(message.id, message.text)}
                      type="button"
                    >
                      {copiedMessageId === message.id ? "Copied" : "Copy"}
                    </button>
                    {mine ? (
                      <span className="message-card__ticks">✓✓</span>
                    ) : null}
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
        >
          <button className="composer-shell__plus" type="button">
            +
          </button>
          <textarea
            className="composer-shell__input"
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={handleComposerKeyDown}
            placeholder="Paste or type something..."
            rows={1}
            value={draft}
          />
          <button
            className="composer-shell__send"
            disabled={!draft.trim()}
            type="submit"
          >
            →
          </button>
        </form>
      </div>

      <div className="session-feature__footer">
        <div className="session-feature__security">
          Shielded temporary relay
        </div>
        <button className="ghost-pill" onClick={onReset} type="button">
          Reset session
        </button>
      </div>

      {errorText ? <p className="feature-error">{errorText}</p> : null}
      <p className="session-feature__device-count">
        Devices connected: {deviceCount}/2
      </p>
    </section>
  );
}
