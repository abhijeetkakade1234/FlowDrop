export type PairingFeatureProps = {
  errorText: string | null;
  joinOtp: string;
  mode: "landing" | "receive" | "share";
  onCreateSession: () => void;
  onJoinOtpChange: (value: string) => void;
  onJoinSession: () => void;
  onSelectReceive: () => void;
  otp: string;
  otpExpiresAt: number | null;
  statusText: string;
};
