export const ARGUS_SERVICE_TYPE = '_argus._tcp';
export const ARGUS_HOST = 'argus.local';
export const ARGUS_DEFAULT_PORT = 7024;
export const PAIRING_PATH = '/pairing';
export const DISCOVERY_TIMEOUT_MS = 6000;
export const PAIRING_TIMEOUT_MS = 8000;

export const NET_STORAGE_KEYS = {
  paired: 'net.paired',
  caPem: 'net.caPem',
  caFingerprint: 'net.caFingerprint',
  host: 'net.host',
  ip: 'net.ip',
  port: 'net.port',
  instanceId: 'net.instanceId',
  pairedAt: 'net.pairedAt',
  accessToken: 'net.accessToken',
  refreshToken: 'net.refreshToken',
} as const;
