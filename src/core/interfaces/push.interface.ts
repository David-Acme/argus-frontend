export type ArgusPushKeys = {
  publicKey: string;
  keyId: string;
};

export interface IArgusPushNative {
  keys(): Promise<ArgusPushKeys>;
  storedToken(): Promise<string | null>;
  deleteToken(): Promise<void>;
  deleteKeys(): Promise<void>;
  setDeclineListener(listener: (callId: string) => void): void;
  setTokenListener(listener: (token: string) => void): void;
  setAlertListener(listener: (alertJson: string) => void): void;
  takeDeclines(): string[];
  sendToBackground(): void;
  stopOngoingCall(): void;
  isKeyguardLocked(): boolean;
  overKeyguard(): boolean;
  outsideCallId(): string;
  exactAlarmsAllowed(): boolean;
  openExactAlarmSettings(): void;
  fullScreenExplained(): boolean;
  setFullScreenExplained(value: boolean): void;
  recordTrace(phase: string, outcome: string, reason: string): void;
}

export interface IPushService {
  register(): Promise<void>;
  bindListeners(): void;
  unpair(): Promise<void>;
  onDecline(listener: (callId: string) => void): () => void;
  drainDeclines(): void;
  sendToBackground(): void;
  stopOngoingCall(): void;
  isKeyguardLocked(): boolean;
  overKeyguard(): boolean;
  outsideCallId(): string;
  notificationsPermitted(): Promise<boolean>;
  requestNotificationsPermission(): Promise<boolean>;
  exactAlarmsAllowed(): boolean;
  openExactAlarmSettings(): void;
}
