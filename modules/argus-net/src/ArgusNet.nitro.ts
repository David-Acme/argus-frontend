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
  /** Saltarse la verificación de CA (solo para flujos pre-pairing tipo TOFU, p.ej. /invite/accept). */
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

/**
 * WebSocket nativo sobre el cliente TLS cacheado (misma CA que los requests).
 * Los callbacks son props asignables desde JS; se disparan en el hilo principal.
 */
export interface ArgusSocket extends HybridObject<{ ios: 'swift', android: 'kotlin' }> {
  sendText(message: string): void;
  sendBinary(data: ArrayBuffer): void;
  close(code?: number, reason?: string): void;
  onOpen: (() => void) | null;
  /** Solo UNO de message/data no es null (texto o binario). */
  onMessage: ((message: string | null, data: ArrayBuffer | null) => void) | null;
  /** Errores estructurados `CODE|message` (NETWORK_ERROR, UNAUTHORIZED, ...). */
  onError: ((code: string, message: string) => void) | null;
  onClose: ((code: number, reason: string) => void) | null;
}

export interface ArgusNet extends HybridObject<{ ios: 'swift', android: 'kotlin' }> {
  discover(timeoutMs: number): Promise<NetDiscovery>;
  pair(host: string, ip: string, port: number, code: string): Promise<NetPairing>;
  configure(caPem: string, allowedHost: string, ip: string): void;
  /** Verifies the CA fingerprint before making it the strict-TLS trust anchor. */
  configureVerified(caPem: string, caFingerprint: string, allowedHost: string, ip: string): void;
  request(options: NetHttpRequest): Promise<NetHttpResult>;
  openSocket(options: NetSocketOptions): Promise<ArgusSocket>;
}
