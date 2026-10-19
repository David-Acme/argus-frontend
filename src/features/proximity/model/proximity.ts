import type {
  IconName,
  ProximityMe,
  ProximityReceiverInput,
  ProximitySensorInput,
  ProximitySensorModel,
  ProximitySensorSource,
  TranslationKey,
} from '@/core/types';

export type BeaconPlatform = 'android' | 'ios' | 'none';

export type BeaconPresence = 'home' | 'away' | 'unknown';

export type BeaconPlanInput = {
  platform: BeaconPlatform;
  me: ProximityMe | null;
  presence: BeaconPresence | null;
  appActive: boolean;
  supported: boolean;
  permitted: boolean;
};

export type BeaconReason =
  | 'advertising'
  | 'off'
  | 'not-located'
  | 'no-seed'
  | 'unsupported'
  | 'no-permission'
  | 'away'
  | 'background';

export type BeaconPlan = {
  advertise: boolean;
  reason: BeaconReason;
};

const stay = (reason: BeaconReason): BeaconPlan => ({ advertise: false, reason });

export function beaconPlan(input: BeaconPlanInput): BeaconPlan {
  if (input.platform === 'none') return stay('unsupported');
  if (!input.me?.ble.enabled) return stay('off');
  if (!input.me.located) return stay('not-located');
  if (!input.me.ble.seed) return stay('no-seed');
  if (!input.supported) return stay('unsupported');
  if (!input.permitted) return stay('no-permission');
  if (input.presence !== 'home') return stay('away');
  if (input.platform === 'ios' && !input.appActive) return stay('background');
  return { advertise: true, reason: 'advertising' };
}

export const BEACON_REASON_LABEL = {
  advertising: 'screens.proximity.ble.status.advertising',
  off: 'screens.proximity.ble.status.off',
  'not-located': 'screens.proximity.ble.status.not-located',
  'no-seed': 'screens.proximity.ble.status.no-seed',
  unsupported: 'screens.proximity.ble.status.unsupported',
  'no-permission': 'screens.proximity.ble.status.no-permission',
  away: 'screens.proximity.ble.status.away',
  background: 'screens.proximity.ble.status.background',
} as const satisfies Record<BeaconReason, TranslationKey>;

export const BEACON_PLATFORM_HINT = {
  android: 'screens.proximity.ble.hint-android',
  ios: 'screens.proximity.ble.hint-ios',
  none: 'screens.proximity.ble.hint-none',
} as const satisfies Record<BeaconPlatform, TranslationKey>;

export const SENSOR_MODEL_LABEL = {
  ld2410: 'screens.proximity.sensors.model.ld2410',
  ld2450: 'screens.proximity.sensors.model.ld2450',
  fp2: 'screens.proximity.sensors.model.fp2',
} as const satisfies Record<ProximitySensorModel, TranslationKey>;

export const SENSOR_SOURCE_LABEL = {
  esphome: 'screens.proximity.sensors.source.esphome',
  home_assistant: 'screens.proximity.sensors.source.home-assistant',
} as const satisfies Record<ProximitySensorSource, TranslationKey>;

export const SENSOR_DEFAULT_PORTS = {
  esphome: 6053,
  home_assistant: 8123,
} as const satisfies Record<ProximitySensorSource, number>;

export const RECEIVER_DEFAULT_PORT = 6053;

export const SENSOR_ICON: IconName = 'activity';

export const RECEIVER_ICON: IconName = 'bluetooth';

export function sensorAims(model: ProximitySensorModel): boolean {
  return model === 'ld2450' || model === 'fp2';
}

export type ProximityFieldError = 'name' | 'room' | 'host' | 'port' | 'entityId' | 'panOffsetDeg';

const HOST = /^(?=.{1,253}$)[A-Za-z0-9](?:[A-Za-z0-9-]{0,62}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,62}[A-Za-z0-9])?)*$/;

const ENTITY = /^[a-z_]+\.[a-z0-9_]+$/;

const validPort = (port: number): boolean => Number.isInteger(port) && port > 0 && port < 65536;

export function receiverErrors(input: ProximityReceiverInput): ProximityFieldError[] {
  const errors: ProximityFieldError[] = [];
  if (!input.name.trim()) errors.push('name');
  if (!input.room.trim()) errors.push('room');
  if (!HOST.test(input.host.trim())) errors.push('host');
  if (!validPort(input.port)) errors.push('port');
  return errors;
}

export function sensorErrors(input: ProximitySensorInput): ProximityFieldError[] {
  const errors: ProximityFieldError[] = [];
  if (!input.name.trim()) errors.push('name');
  if (!input.room.trim()) errors.push('room');
  if (!HOST.test(input.host.trim())) errors.push('host');
  if (!validPort(input.port)) errors.push('port');
  if (input.source === 'home_assistant' && !ENTITY.test(input.entityId.trim())) errors.push('entityId');
  if (input.panOffsetDeg !== null && (!Number.isFinite(input.panOffsetDeg) || Math.abs(input.panOffsetDeg) > 180)) {
    errors.push('panOffsetDeg');
  }
  return errors;
}

export function parsePort(text: string): number {
  return /^\d{1,5}$/.test(text.trim()) ? Number(text.trim()) : Number.NaN;
}

export function parseOffset(text: string): number | null {
  const trimmed = text.trim().replace(',', '.');
  if (!trimmed) return null;
  return /^-?\d{1,3}(?:\.\d+)?$/.test(trimmed) ? Number(trimmed) : Number.NaN;
}
