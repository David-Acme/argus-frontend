import type { HomeService, IconName, NetRouteStatus, TranslationKey } from '@/core/types';

export const ARGUS_HOST = 'argus.local';
export const ARGUS_PAIRING_PORT = 7044;

export const ARGUS_RELAY_DOMAIN = 'argus-tunnel.lynk.page';

export const ARGUS_HOME_SERVICES: readonly HomeService[] = [
  'auth',
  'identity',
  'sync',
  'camera',
  'productivity',
  'notification',
  'guard',
  'settings',
];

export const ARGUS_SERVICE_DEFAULT_PORTS: Readonly<Record<HomeService, number>> = {
  auth: 7042,
  identity: 7044,
  sync: 7025,
  camera: 7026,
  productivity: 7027,
  notification: 7028,
  guard: 7039,
  settings: 7045,
};

export const ARGUS_ROUTE_SERVICES: Readonly<Record<string, HomeService>> = {
  auth: 'auth',
  pairing: 'identity',
  invitation: 'identity',
  user: 'identity',
  'portrait-preview': 'identity',
  voiceprint: 'identity',
  privacy: 'identity',
  visitor: 'identity',
  'visitor-settings': 'identity',
  'visitor-crop': 'identity',
  camera: 'camera',
  zone: 'camera',
  clip: 'camera',
  media: 'camera',
  modules: 'settings',
  project: 'productivity',
  'project-task': 'productivity',
  'project-member': 'productivity',
  'calendar-event': 'productivity',
  'calendar-event-share': 'productivity',
  reminder: 'productivity',
  notification: 'notification',
  'notification-token': 'notification',
  conversation: 'notification',
  guard: 'guard',
  settings: 'settings',
  sync: 'sync',
  rtc: 'sync',
};

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
  clip: 7026,
  media: 7026,
  modules: 7045,
  project: 7027,
  'project-task': 7027,
  'project-member': 7027,
  'calendar-event': 7027,
  'calendar-event-share': 7027,
  reminder: 7027,
  notification: 7028,
  'notification-token': 7028,
  conversation: 7028,
  guard: 7039,
  settings: 7045,
  sync: 7025,
  rtc: 7025,
};

export const DISCOVERY_TIMEOUT_MS = 6000;

export const NET_ROUTE_PROBE_TIMEOUT_MS = 4000;

export const NET_ROUTE_RELAY_HEAD_START_MS = 1500;

export interface NetRouteStatusView {
  icon: IconName;
  title: TranslationKey;
  detail: TranslationKey;
}

export const NET_ROUTE_STATUS_VIEWS: Readonly<Record<NetRouteStatus, NetRouteStatusView>> = {
  home: { icon: 'home', title: 'common.route.home', detail: 'common.route.home-detail' },
  cloud: { icon: 'cloud', title: 'common.route.cloud', detail: 'common.route.cloud-detail' },
  unreachable: {
    icon: 'wifi-off',
    title: 'common.route.unreachable',
    detail: 'common.route.unreachable-detail',
  },
  'remote-unavailable': {
    icon: 'cloud-off',
    title: 'common.route.remote-unavailable',
    detail: 'common.route.remote-unavailable-detail',
  },
};

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
  remoteHomeId: 'net.remoteHomeId',
  remoteDomain: 'net.remoteDomain',
} as const;

export const NET_TRUST_KEYS: readonly string[] = [
  NET_STORAGE_KEYS.caPem,
  NET_STORAGE_KEYS.caFingerprint,
  NET_STORAGE_KEYS.host,
  NET_STORAGE_KEYS.ip,
];
