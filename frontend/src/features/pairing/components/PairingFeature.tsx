import { FlowDropLogo } from "../../../shared/ui/liquid/FlowDropLogo";
import type { PairingFeatureProps } from "../pairing.types";
import { formatOtp, formatTimeLeft, splitOtpDigits } from "../pairing.utils";

function SendIcon() {
  return (
    <svg
      aria-hidden="true"
      className="pairing-feature__icon-svg"
      viewBox="0 0 20 20"
    >
      <path
        d="M16.4 3.6 8.9 11.1M16.4 3.6 11.6 16.4 8.9 11.1 3.6 8.4 16.4 3.6Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ReceiveIcon() {
  return (
    <svg
      aria-hidden="true"
      className="pairing-feature__icon-svg"
      viewBox="0 0 20 20"
    >
      <path
        d="M10 3.8v8.4M6.8 9.8 10 13.2l3.2-3.4M4.2 15.6h11.6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
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

function PlusIcon() {
  return (
    <svg
      aria-hidden="true"
      className="pairing-feature__icon-svg pairing-feature__icon-svg--small"
      viewBox="0 0 20 20"
    >
      <path
        d="M10 4.2v11.6M4.2 10h11.6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      aria-hidden="true"
      className="pairing-feature__icon-svg pairing-feature__icon-svg--small"
      viewBox="0 0 20 20"
    >
      <path
        d="M4.4 10h10.8m0 0-3.4-3.4m3.4 3.4-3.4 3.4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function PairingFeature({
  joinOtp,
  mode,
  onCreateSession,
  onJoinOtpChange,
  onJoinSession,
  onSelectReceive,
  otp,
  otpExpiresAt,
  statusText,
}: PairingFeatureProps) {
  const otpDigits = splitOtpDigits(otp || "      ");
  const otpSecondsLeft = otpExpiresAt
    ? otpExpiresAt - Math.floor(Date.now() / 1000)
    : 0;

  return (
    <section className="pairing-feature">
      <div className="pairing-feature__panel glass-window">
        {mode === "landing" ? (
          <div className="pairing-feature__column pairing-feature__column--single">
            <div className="pairing-feature__hero-logo">
              <FlowDropLogo />
            </div>
            <div className="pairing-feature__copy">
              <h2>FlowDrop</h2>
              <p>Share anything. Everything disappears in 1 hour.</p>
            </div>

            <div className="pairing-feature__actions">
              <button
                className="pairing-feature__liquid-button pairing-feature__liquid-button--primary"
                onClick={onCreateSession}
                type="button"
              >
                <span className="pairing-feature__button-glow" />
                <SendIcon />
                <span>Send</span>
              </button>
              <button
                className="pairing-feature__liquid-button pairing-feature__liquid-button--secondary"
                onClick={onSelectReceive}
                type="button"
              >
                <span className="pairing-feature__button-glow pairing-feature__button-glow--soft" />
                <ReceiveIcon />
                <span>Receive</span>
              </button>
            </div>

            <p className="pairing-feature__hint">
              No login. No tracking. 100% private.
            </p>
          </div>
        ) : mode === "share" ? (
          <div className="pairing-feature__column pairing-feature__column--single">
            <div className="pairing-feature__orb pairing-feature__orb--left" />
            <div className="pairing-feature__copy">
              <span className="section-kicker">Share</span>
              <h2>Connect your device</h2>
              <p>Enter this code on your other device to start sharing.</p>
            </div>

            <div className="pairing-feature__otp">
              {otpDigits.map((digit, index) => (
                <div className="otp-slot" key={`${digit}-${index}`}>
                  <span>{digit.trim() || "·"}</span>
                </div>
              ))}
            </div>

            <div className="pairing-feature__meta">
              <div className="status-pill status-pill--danger">
                <span className="status-pill__dot" />
                {otp
                  ? `Expires in ${formatTimeLeft(otpSecondsLeft)}`
                  : statusText}
              </div>
              <button
                className="ghost-pill"
                onClick={onCreateSession}
                type="button"
              >
                <RefreshIcon />
                Generate new code
              </button>
            </div>
          </div>
        ) : (
          <div className="pairing-feature__column pairing-feature__column--single">
            <div className="pairing-feature__orb pairing-feature__orb--right" />
            <div className="pairing-feature__copy">
              <span className="section-kicker">Receive</span>
              <h2>Enter pairing code</h2>
              <p>Enter the 6-digit code shown on the other device.</p>
            </div>

            <form
              className="pairing-form"
              onSubmit={(event) => {
                event.preventDefault();
                onJoinSession();
              }}
            >
              <input
                className="glass-input-row"
                inputMode="numeric"
                onChange={(event) =>
                  onJoinOtpChange(formatOtp(event.target.value))
                }
                placeholder="483 921"
                value={joinOtp}
              />

              <button className="primary-liquid-button" type="submit">
                <span className="pairing-feature__button-glow" />
                <span>Connect</span>
                <ArrowRightIcon />
              </button>
            </form>

            <button
              className="pairing-feature__liquid-button pairing-feature__liquid-button--secondary"
              onClick={onCreateSession}
              type="button"
            >
              <span className="pairing-feature__button-glow pairing-feature__button-glow--soft" />
              <PlusIcon />
              Create new session
            </button>
            <p className="pairing-feature__hint">
              Secure 256-bit encrypted connection.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
