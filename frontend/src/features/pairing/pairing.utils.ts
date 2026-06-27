export function formatOtp(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 6);
  if (digits.length <= 3) {
    return digits;
  }

  return `${digits.slice(0, 3)} ${digits.slice(3)}`;
}

export function splitOtpDigits(otp: string) {
  const digits = otp.replace(/\D/g, "").padEnd(6, " ");
  return digits.split("").slice(0, 6);
}

export function formatTimeLeft(secondsLeft: number) {
  const safe = Math.max(secondsLeft, 0);
  const minutes = Math.floor(safe / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (safe % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}
