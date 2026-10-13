export type NetMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export type NetErrorCode =
  | 'PAIRING_REQUIRED'
  | 'INVALID_PAIRING_CODE'
  | 'ALREADY_PAIRED'
  | 'PAIRING_DECLINED'
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

export interface NetPin {
  caFingerprint: string;
  host: string;
}

export interface NetHttpResult {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export type HomeService =
  | 'auth'
  | 'identity'
  | 'sync'
  | 'camera'
  | 'productivity'
  | 'notification'
  | 'guard'
  | 'settings';

export type NetRouteMode = 'lan' | 'relay';

export type NetRouteStatus = 'home' | 'cloud' | 'unreachable';

export type NetProbeOutcome = 'reached' | 'failed' | 'absent';

export interface NetRemoteProfile {
  homeId: string;
  domain: string;
}

export type NetRemoteLink = 'up' | 'connecting' | 'down';

export interface NetRemoteState extends NetRemoteProfile {
  link: NetRemoteLink;
  since: number;
}

export interface NetRouteProbe {
  lan: NetProbeOutcome;
  relay: NetProbeOutcome;
}

export interface NetRouteChoice {
  mode: NetRouteMode;
  status: NetRouteStatus;
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
  remote?: NetRemoteProfile;
  route?: NetRouteMode;
}

export interface NetError {
  code: NetErrorCode;
  message: string;
  status?: number;
}
