import { type HybridObject } from 'react-native-nitro-modules';

export interface NetRoute {
  path: string;
  port: number;
  https: boolean;
}

export interface NetDiscovery {
  host: string;
  ip: string;
  port: number;
  https: boolean;
  routes: NetRoute[];
}

export interface NetPairing {
  caPem: string;
  caFingerprint: string;
  serverFingerprint: string;
  instanceId: string;
  port: number;
  scheme: string;
}

export interface NetHttpFile {
  name: string;
  uri: string;
  filename: string;
  contentType: string;
}

export interface NetHttpRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  files: NetHttpFile[];
  trustAny?: boolean;
}

export interface NetHttpResult {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export interface NetSocketOptions {
  url: string;
  headers?: Record<string, string>;
  connectTimeoutMs?: number;
}

export interface ArgusSocket extends HybridObject<{ ios: 'swift', android: 'kotlin' }> {
  sendText(message: string): void;
  sendBinary(data: ArrayBuffer): void;
  close(code?: number, reason?: string): void;
  onOpen: (() => void) | null;
  onMessage: ((message: string | null, data: ArrayBuffer | null) => void) | null;
  onError: ((code: string, message: string) => void) | null;
  onClose: ((code: number, reason: string) => void) | null;
}

export interface ArgusNet extends HybridObject<{ ios: 'swift', android: 'kotlin' }> {
  discover(timeoutMs: number): Promise<NetDiscovery>;
  pair(host: string, ip: string, port: number, code: string): Promise<NetPairing>;
  configure(caPem: string, allowedHost: string, ip: string): void;
  configureVerified(caPem: string, caFingerprint: string, allowedHost: string, ip: string): void;
  request(options: NetHttpRequest): Promise<NetHttpResult>;
  openSocket(options: NetSocketOptions): Promise<ArgusSocket>;
}
