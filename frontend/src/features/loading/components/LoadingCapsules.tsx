import type { LoadingCapsulesProps } from "../loading.types";

export function LoadingCapsules({ draftReady, paired }: LoadingCapsulesProps) {
  return (
    <div className="loading-capsules" aria-hidden="true">
      <div className="loading-capsule loading-capsule--sending">
        <span className="loading-capsule__icon loading-capsule__icon--spin">
          ◌
        </span>
        <span>{draftReady ? "Ready to send" : "Sending..."}</span>
      </div>
      <div className="loading-capsule loading-capsule--encrypting">
        <span className="loading-capsule__icon">⌁</span>
        <span>Encrypting</span>
      </div>
      <div className="loading-capsule loading-capsule--connected">
        <span className="loading-capsule__icon">●</span>
        <span>{paired ? "Connected" : "Waiting"}</span>
      </div>
    </div>
  );
}
