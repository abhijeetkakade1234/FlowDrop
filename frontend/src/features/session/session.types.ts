export type Message = {
  id: string;
  text: string;
  createdAt: number;
  senderDeviceId: string;
};

export type ApiSessionCreate = {
  sessionId: string;
  otp: string;
  accessToken: string;
  otpExpiresIn: number;
  sessionExpiresAt: number;
};

export type ApiSessionJoin = {
  success: true;
  sessionId: string;
  sessionExpiresAt: number;
  accessToken: string;
};

export type ApiSessionState = {
  sessionId: string;
  connected: boolean;
  sessionExpiresAt: number;
  messages: Message[];
};

export type ServerEvent =
  | {
      type: "SESSION_READY";
      data: {
        sessionId: string;
        sessionExpiresAt: number;
        deviceCount: number;
      };
    }
  | {
      type: "DEVICE_CONNECTED" | "DEVICE_LEFT";
      data: {
        deviceCount: number;
      };
    }
  | {
      type: "TEXT_MESSAGE";
      data: Message;
    }
  | {
      type: "SESSION_CLOSED";
      data: {
        initiatedByDeviceId: string;
      };
    }
  | {
      type: "ERROR";
      data: {
        code: string;
        message: string;
      };
    };

export type SessionFeatureProps = {
  deviceCount: number;
  deviceId: string;
  draft: string;
  errorText: string | null;
  messages: Message[];
  onDraftChange: (value: string) => void;
  onReset: () => void;
  onSend: () => void;
  paired: boolean;
  resetPending: boolean;
  sessionExpiresAt: number | null;
  statusText: string;
};
