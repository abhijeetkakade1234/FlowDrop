import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { QRCodeSVG } from "qrcode.react";
import { UiCircleButton } from "../../../shared/ui/primitives";
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

function BackIcon() {
  return (
    <svg
      aria-hidden="true"
      className="pairing-feature__icon-svg pairing-feature__icon-svg--small"
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

type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue?: string }>>;
};

type BarcodeDetectorCtor = {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
};

export function PairingFeature({
  backPending,
  createPending,
  joinOtp,
  joinPending,
  mode,
  onBack,
  onCreateSession,
  onRefreshSession,
  onJoinOtpChange,
  onJoinSession,
  onScanQrCode,
  onSelectReceive,
  otp,
  otpExpiresAt,
  qrJoinUrl,
  refreshPending,
  statusText,
}: PairingFeatureProps) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [showScannerDialog, setShowScannerDialog] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerStreamRef = useRef<MediaStream | null>(null);
  const scannerFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!otpExpiresAt) {
      return;
    }

    const timer = window.setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [otpExpiresAt]);

  const otpDigits = splitOtpDigits(otp || "      ");
  const otpSecondsLeft = otpExpiresAt ? otpExpiresAt - now : 0;
  const createBusy = createPending;
  const joinBusy = joinPending;

  useEffect(() => {
    if (mode !== "share") {
      setShowQrDialog(false);
    }
    if (mode !== "receive") {
      setShowScannerDialog(false);
    }
  }, [mode]);

  useEffect(() => {
    if (!showScannerDialog) {
      if (scannerFrameRef.current) {
        window.cancelAnimationFrame(scannerFrameRef.current);
        scannerFrameRef.current = null;
      }
      scannerStreamRef.current?.getTracks().forEach((track) => track.stop());
      scannerStreamRef.current = null;
      setScannerError(null);
      return;
    }

    let cancelled = false;
    let detector: BarcodeDetectorLike | null = null;
    let canvas: HTMLCanvasElement | null = null;
    let context: CanvasRenderingContext2D | null = null;

    async function startScanner() {
      const Detector = (
        window as Window & {
          BarcodeDetector?: BarcodeDetectorCtor;
        }
      ).BarcodeDetector;

      try {
        detector = Detector ? new Detector({ formats: ["qr_code"] }) : null;
        canvas = document.createElement("canvas");
        context = canvas.getContext("2d", { willReadFrequently: true });

        if (!navigator.mediaDevices?.getUserMedia || !canvas || !context) {
          setScannerError(
            "QR scanning is not supported here. Type the code instead.",
          );
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        scannerStreamRef.current = stream;
        const video = videoRef.current;
        if (!video) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        video.srcObject = stream;
        await video.play();

        const scanFrame = async () => {
          if (
            cancelled ||
            !videoRef.current ||
            !detector ||
            videoRef.current.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
          ) {
            if (!cancelled) {
              scannerFrameRef.current = window.requestAnimationFrame(scanFrame);
            }
            return;
          }

          try {
            let scannedValue = "";

            if (detector) {
              const results = await detector.detect(videoRef.current);
              scannedValue =
                results.find((result) => result.rawValue)?.rawValue ?? "";
            } else if (canvas && context) {
              const width = videoRef.current.videoWidth;
              const height = videoRef.current.videoHeight;

              if (width && height) {
                canvas.width = width;
                canvas.height = height;
                context.drawImage(videoRef.current, 0, 0, width, height);
                const imageData = context.getImageData(0, 0, width, height);
                scannedValue =
                  jsQR(imageData.data, imageData.width, imageData.height)
                    ?.data ?? "";
              }
            }

            if (scannedValue) {
              onScanQrCode(scannedValue);
              setShowScannerDialog(false);
              return;
            }
          } catch {
            setScannerError("Could not scan that QR code yet. Try again.");
            setShowScannerDialog(false);
            return;
          }

          scannerFrameRef.current = window.requestAnimationFrame(scanFrame);
        };

        scannerFrameRef.current = window.requestAnimationFrame(scanFrame);
      } catch {
        setScannerError(
          "Camera access failed. Allow camera access or type the code instead.",
        );
      }
    }

    void startScanner();

    return () => {
      cancelled = true;
      if (scannerFrameRef.current) {
        window.cancelAnimationFrame(scannerFrameRef.current);
        scannerFrameRef.current = null;
      }
      scannerStreamRef.current?.getTracks().forEach((track) => track.stop());
      scannerStreamRef.current = null;
    };
  }, [onScanQrCode, showScannerDialog]);

  return (
    <section className="pairing-feature">
      {mode !== "landing" ? (
        <div className="pairing-feature__actions-bar">
          <UiCircleButton
            ariaLabel="Back"
            className="pairing-feature__back"
            disabled={backPending}
            onClick={onBack}
            size="md"
          >
            {backPending ? (
              <span className="pairing-feature__spinner" aria-hidden="true" />
            ) : (
              <>
                <BackIcon />
                <span className="pairing-feature__back-label">Back</span>
              </>
            )}
          </UiCircleButton>
        </div>
      ) : null}

      <div className="pairing-feature__panel">
        {mode === "landing" ? (
          <div className="pairing-feature__column pairing-feature__column--single pairing-feature__column--landing">
            <div className="pairing-feature__surface pairing-feature__surface--hero">
              <div className="pairing-feature__hero-logo">
                <FlowDropLogo />
              </div>
              <div className="pairing-feature__copy">
                <h2>FlowDrop</h2>
                <p>Share anything. Everything disappears in 1 hour.</p>
              </div>
            </div>

            <div className="pairing-feature__surface pairing-feature__surface--actions">
              <div className="pairing-feature__actions">
                <button
                  className="pairing-feature__liquid-button pairing-feature__liquid-button--primary"
                  disabled={createBusy}
                  onClick={onCreateSession}
                  type="button"
                >
                  <span className="pairing-feature__button-glow" />
                  {createBusy ? (
                    <span
                      className="pairing-feature__spinner"
                      aria-hidden="true"
                    />
                  ) : (
                    <SendIcon />
                  )}
                  <span>Send</span>
                </button>
                <button
                  className="pairing-feature__liquid-button pairing-feature__liquid-button--secondary"
                  disabled={createBusy}
                  onClick={onSelectReceive}
                  type="button"
                >
                  <span className="pairing-feature__button-glow pairing-feature__button-glow--soft" />
                  <ReceiveIcon />
                  <span>Receive</span>
                </button>
              </div>
            </div>

            <p className="pairing-feature__hint">
              No login. No tracking. 100% private.
            </p>
          </div>
        ) : mode === "share" ? (
          <div className="pairing-feature__column pairing-feature__column--single">
            <div className="pairing-feature__surface pairing-feature__surface--hero">
              <div className="pairing-feature__orb pairing-feature__orb--left" />
              <div className="pairing-feature__copy">
                <span className="section-kicker">Share</span>
                <h2>Connect your device</h2>
                <p>Enter this code on your other device to start sharing.</p>
              </div>
            </div>

            <div className="pairing-feature__surface pairing-feature__surface--otp">
              <div className="pairing-feature__otp">
                {otpDigits.map((digit, index) => (
                  <div className="otp-slot" key={`${digit}-${index}`}>
                    <span>{digit.trim() || "."}</span>
                  </div>
                ))}
              </div>
            </div>

            {qrJoinUrl ? (
              <div className="pairing-feature__surface pairing-feature__surface--qr">
                <button
                  className="pairing-feature__qr-trigger ghost-pill"
                  onClick={() => setShowQrDialog(true)}
                  type="button"
                >
                  <span className="section-kicker">Scan instead</span>
                  <span>Show QR code</span>
                </button>
              </div>
            ) : null}

            <div className="pairing-feature__surface pairing-feature__surface--meta">
              <div className="pairing-feature__meta">
                <div className="status-pill status-pill--danger">
                  <span className="status-pill__dot" />
                  {otp
                    ? `Expires in ${formatTimeLeft(otpSecondsLeft)}`
                    : statusText}
                </div>
                <button
                  className="ghost-pill"
                  disabled={refreshPending}
                  onClick={onRefreshSession}
                  type="button"
                >
                  {refreshPending ? (
                    <span
                      className="pairing-feature__spinner pairing-feature__spinner--dark"
                      aria-hidden="true"
                    />
                  ) : (
                    <RefreshIcon />
                  )}
                  Check connection
                </button>
                <button
                  className="ghost-pill"
                  disabled={createBusy}
                  onClick={onCreateSession}
                  type="button"
                >
                  {createBusy ? (
                    <span
                      className="pairing-feature__spinner pairing-feature__spinner--dark"
                      aria-hidden="true"
                    />
                  ) : (
                    <RefreshIcon />
                  )}
                  Generate new code
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="pairing-feature__column pairing-feature__column--single">
            <div className="pairing-feature__surface pairing-feature__surface--hero">
              <div className="pairing-feature__orb pairing-feature__orb--right" />
              <div className="pairing-feature__copy">
                <span className="section-kicker">Receive</span>
                <h2>Enter pairing code</h2>
                <p>Enter the 6-digit code shown on the other device.</p>
              </div>
            </div>

            <div className="pairing-feature__surface pairing-feature__surface--form">
              <form
                className="pairing-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  onJoinSession();
                }}
              >
                <input
                  className="glass-input-row"
                  disabled={joinBusy}
                  inputMode="numeric"
                  onChange={(event) =>
                    onJoinOtpChange(formatOtp(event.target.value))
                  }
                  placeholder="483 921"
                  value={joinOtp}
                />

                <button
                  className="primary-liquid-button"
                  disabled={joinBusy}
                  type="submit"
                >
                  <span className="pairing-feature__button-glow" />
                  {joinBusy ? (
                    <span
                      className="pairing-feature__spinner"
                      aria-hidden="true"
                    />
                  ) : null}
                  <span>Connect</span>
                  {!joinBusy ? <ArrowRightIcon /> : null}
                </button>
              </form>
            </div>

            <div className="pairing-feature__surface pairing-feature__surface--secondary-action">
              <button
                className="pairing-feature__liquid-button pairing-feature__liquid-button--secondary"
                onClick={() => setShowScannerDialog(true)}
                type="button"
              >
                <span className="pairing-feature__button-glow pairing-feature__button-glow--soft" />
                <ReceiveIcon />
                Scan QR code
              </button>
            </div>

            <div className="pairing-feature__surface pairing-feature__surface--secondary-action">
              <button
                className="pairing-feature__liquid-button pairing-feature__liquid-button--secondary"
                disabled={createBusy}
                onClick={onCreateSession}
                type="button"
              >
                <span className="pairing-feature__button-glow pairing-feature__button-glow--soft" />
                {createBusy ? (
                  <span
                    className="pairing-feature__spinner pairing-feature__spinner--dark"
                    aria-hidden="true"
                  />
                ) : (
                  <PlusIcon />
                )}
                Create new session
              </button>
            </div>

            <p className="pairing-feature__hint">
              Secure 256-bit encrypted connection.
            </p>
          </div>
        )}
      </div>

      {showQrDialog && qrJoinUrl ? (
        <div
          className="app-modal-backdrop"
          onClick={() => setShowQrDialog(false)}
          role="presentation"
        >
          <div
            aria-modal="true"
            className="pairing-feature__qr-dialog glass-window"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <button
              aria-label="Close QR code"
              className="pairing-feature__qr-dialog-close"
              onClick={() => setShowQrDialog(false)}
              type="button"
            >
              <BackIcon />
            </button>
            <div className="pairing-feature__qr-copy">
              <span className="section-kicker">Scan instead</span>
              <p>Scan on your other device to open FlowDrop and connect.</p>
            </div>
            <div className="pairing-feature__qr-code">
              <QRCodeSVG
                bgColor="transparent"
                fgColor="#1f2a3d"
                level="M"
                marginSize={1}
                size={168}
                title="FlowDrop pairing QR code"
                value={qrJoinUrl}
              />
            </div>
          </div>
        </div>
      ) : null}

      {showScannerDialog ? (
        <div
          className="app-modal-backdrop"
          onClick={() => setShowScannerDialog(false)}
          role="presentation"
        >
          <div
            aria-modal="true"
            className="pairing-feature__qr-dialog glass-window"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <button
              aria-label="Close QR scanner"
              className="pairing-feature__qr-dialog-close"
              onClick={() => setShowScannerDialog(false)}
              type="button"
            >
              <BackIcon />
            </button>
            <div className="pairing-feature__qr-copy">
              <span className="section-kicker">Scan QR code</span>
              <p>Point your camera at the FlowDrop QR on the other device.</p>
            </div>
            <div className="pairing-feature__scanner-frame">
              <video
                autoPlay
                className="pairing-feature__scanner-video"
                muted
                playsInline
                ref={videoRef}
              />
              <div className="pairing-feature__scanner-guide" />
            </div>
            {scannerError ? (
              <p className="pairing-feature__scanner-error">{scannerError}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
