export type TextMessage = {
  id: string;
  createdAt: number;
  senderDeviceId: string;
  kind: "text";
  text: string;
};

export type ImageMessage = {
  id: string;
  createdAt: number;
  senderDeviceId: string;
  kind: "image";
  image: {
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  };
};

export type Message = TextMessage | ImageMessage;

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
      data: TextMessage;
    }
  | {
      type: "IMAGE_MESSAGE";
      data: ImageMessage;
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
  imageUrls: Record<string, string>;
  onDraftChange: (value: string) => void;
  onDownloadImage: (message: ImageMessage) => void;
  onRefreshSession: () => void;
  onReset: () => void;
  onSend: () => void;
  onSendImage: () => void;
  onSelectImage: (file: File) => void;
  onClearSelectedImage: () => void;
  paired: boolean;
  refreshPending: boolean;
  resetPending: boolean;
  selectedImage: {
    fileName: string;
    mimeType: string;
    previewUrl: string;
    sizeBytes: number;
  } | null;
  sendingImage: boolean;
  sessionExpiresAt: number | null;
  statusText: string;
};
