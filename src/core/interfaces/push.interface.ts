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
  takeDeclines(): string[];
  fullScreenExplained(): boolean;
  setFullScreenExplained(value: boolean): void;
}

export interface IPushService {
  register(): Promise<void>;
  unpair(): Promise<void>;
  onDecline(listener: (callId: string) => void): () => void;
  drainDeclines(): void;
}
