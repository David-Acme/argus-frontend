import { type HybridObject } from 'react-native-nitro-modules';

export interface NetDiscovery {
  host: string;
  ip: string;
  port: number;
  https: boolean;
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
}

export interface NetHttpResult {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export interface ArgusNet extends HybridObject<{ ios: 'swift', android: 'kotlin' }> {
  discover(timeoutMs: number): Promise<NetDiscovery>;
  pair(host: string, ip: string, port: number, code: string): Promise<NetPairing>;
  configure(caPem: string, allowedHost: string, ip: string): void;
  request(options: NetHttpRequest): Promise<NetHttpResult>;
}
