export const ARGUS_HOST = 'argus.local';
export const ARGUS_PAIRING_PORT = 7044;

export const ARGUS_DEFAULT_ROUTE_PORTS: Readonly<Record<string, number>> = {
  auth: 7042,
  pairing: 7044,
  invitation: 7044,
  user: 7044,
  'portrait-preview': 7044,
  voiceprint: 7044,
  privacy: 7044,
  visitor: 7044,
  'visitor-settings': 7044,
  'visitor-crop': 7044,
  camera: 7026,
  zone: 7026,
  media: 7026,
  modules: 7045,
  project: 7027,
  'project-task': 7027,
  'project-member': 7027,
  'calendar-event': 7027,
  'calendar-event-share': 7027,
  notification: 7028,
  'notification-token': 7028,
  guard: 7039,
  settings: 7045,
  sync: 7025,
  rtc: 7025,
};

export const DISCOVERY_TIMEOUT_MS = 6000;

export const NET_STORAGE_KEYS = {
  paired: 'net.paired',
  caPem: 'net.caPem',
  caFingerprint: 'net.caFingerprint',
  host: 'net.host',
  ip: 'net.ip',
  port: 'net.port',
  instanceId: 'net.instanceId',
  pairedAt: 'net.pairedAt',
  routes: 'net.routes',
  accessToken: 'net.accessToken',
  refreshToken: 'net.refreshToken',
  deviceCredential: 'net.deviceCredential',
} as const;

export const NET_TRUST_KEYS: readonly string[] = [
  NET_STORAGE_KEYS.caPem,
  NET_STORAGE_KEYS.caFingerprint,
  NET_STORAGE_KEYS.host,
  NET_STORAGE_KEYS.ip,
];
