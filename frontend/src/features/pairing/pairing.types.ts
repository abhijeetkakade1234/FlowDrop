export type PairingFeatureProps = {
  backPending: boolean;
  createPending: boolean;
  errorText: string | null;
  joinPending: boolean;
  joinOtp: string;
  mode: "landing" | "receive" | "share";
  refreshPending: boolean;
  onCreateSession: () => void;
  onBack: () => void;
  onRefreshSession: () => void;
  onJoinOtpChange: (value: string) => void;
  onJoinSession: () => void;
  onSelectReceive: () => void;
  otp: string;
  otpExpiresAt: number | null;
  statusText: string;
};
