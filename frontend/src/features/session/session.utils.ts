import type { Message } from "./session.types";

export function formatSessionTimeLeft(sessionExpiresAt: number | null) {
  if (!sessionExpiresAt) {
    return "59:59";
  }

  const safe = Math.max(sessionExpiresAt - Math.floor(Date.now() / 1000), 0);
  const minutes = Math.floor(safe / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (safe % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function formatMessageTime(epochSeconds: number) {
  return new Date(epochSeconds * 1000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isOwnMessage(message: Message, deviceId: string) {
  return message.senderDeviceId === deviceId;
}
