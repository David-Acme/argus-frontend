export type NetMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export type NetErrorCode =
  | 'PAIRING_REQUIRED'
  | 'INVALID_PAIRING_CODE'
  | 'ALREADY_PAIRED'
  | 'FINGERPRINT_MISMATCH'
  | 'CERT_NOT_TRUSTED'
  | 'UNAUTHORIZED'
  | 'HOST_NOT_ALLOWED'
  | 'DISCOVERY_NOT_FOUND'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'STORAGE_ERROR';

export interface NetRoute {
  path: string;
  port: number;
  https: boolean;
}

export type NetRoutePorts = Record<string, number>;

export interface NetDiscovery {
  host: string;
  ip: string;
  port: number;
  https: boolean;
  routes: NetRoute[];
}

export interface NetPairExpectation {
  caFingerprint: string;
  instanceId: string;
}

export interface NetPairInput {
  host: string;
  ip: string;
  port: number;
  code: string;
  routes: NetRoutePorts;
  expect?: NetPairExpectation;
}

export interface NetAdoptInput {
  pairing: NetPairing;
  host: string;
  ip: string;
  routes: NetRoutePorts;
}

export interface NetAddressUpdate {
  ip: string;
  routes: NetRoutePorts;
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
  method: NetMethod;
  headers?: Record<string, string>;
  body?: string;
  files?: NetHttpFile[];
}

export interface NetHttpResult {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export interface NetPairedInstance {
  host: string;
  ip: string;
  port: number;
  caPem: string;
  caFingerprint: string;
  instanceId: string;
  pairedAt: number;
  routes: NetRoutePorts;
}

export interface NetError {
  code: NetErrorCode;
  message: string;
  status?: number;
}
