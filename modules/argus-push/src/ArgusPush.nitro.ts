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
  takeDeclines(): string[];
  endActiveCall(): void;
  sendToBackground(): void;
  isKeyguardLocked(): boolean;
  overKeyguard(): boolean;
  exactAlarmsAllowed(): boolean;
  openExactAlarmSettings(): void;
  canUseFullScreenIntent(): boolean;
  openFullScreenSettings(): void;
  fullScreenExplained(): boolean;
  setFullScreenExplained(value: boolean): void;
}
