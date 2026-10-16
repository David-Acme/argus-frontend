import { type HybridObject } from 'react-native-nitro-modules';

export interface ArgusPushKeys {
  publicKey: string;
  keyId: string;
}

export interface ArgusPush extends HybridObject<{ android: 'kotlin' }> {
  keys(): Promise<ArgusPushKeys>;
  storedToken(): Promise<string | null>;
  deleteToken(): Promise<void>;
  deleteKeys(): Promise<void>;
  setDeclineListener(listener: (callId: string) => void): void;
  setTokenListener(listener: (token: string) => void): void;
  setAlertListener(listener: (alertJson: string) => void): void;
  setCallControlListener(listener: (action: string) => void): void;
  telecomCallActive(): boolean;
  setCallMuted(muted: boolean): void;
  takeDeclines(): string[];
  ackDecline(callId: string): void;
  endActiveCall(): void;
  stopOngoingCall(): void;
  sendToBackground(): void;
  isKeyguardLocked(): boolean;
  overKeyguard(): boolean;
  outsideCallId(): string;
  exactAlarmsAllowed(): boolean;
  openExactAlarmSettings(): void;
  canUseFullScreenIntent(): boolean;
  openFullScreenSettings(): void;
  fullScreenExplained(): boolean;
  setFullScreenExplained(value: boolean): void;
  recordTrace(phase: string, outcome: string, reason: string): void;
}
