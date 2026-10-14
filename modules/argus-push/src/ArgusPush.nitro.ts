import { type HybridObject } from 'react-native-nitro-modules';

export interface ArgusPush extends HybridObject<{ android: 'kotlin' }> {
  ensureKey(): Promise<void>;
  publicKey(): Promise<string>;
  keyId(): Promise<string>;
  pushToken(): Promise<string>;
  storedPushToken(): string;
  deleteFcmToken(): Promise<void>;
  wipe(): Promise<void>;
  takeDeclines(): string[];
  canUseFullScreenIntent(): boolean;
  openFullScreenSettings(): void;
  fullScreenExplanationShown(): boolean;
  markFullScreenExplanationShown(): void;
  endActiveCall(): void;
}
