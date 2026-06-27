export type PairingFeatureProps = {
  createPending: boolean;
  errorText: string | null;
  joinPending: boolean;
  joinOtp: string;
  mode: "landing" | "receive" | "share";
  onCreateSession: () => void;
  onBack: () => void;
  onJoinOtpChange: (value: string) => void;
  onJoinSession: () => void;
  onSelectReceive: () => void;
  otp: string;
  otpExpiresAt: number | null;
  statusText: string;
};
