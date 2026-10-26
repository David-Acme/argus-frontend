import { localeDictionaries } from '@/core/i18n/locales';
import { translate } from '@/core/i18n/translate';
import type {
  GuardEnvironment,
  GuardEpisode,
  GuardExpectedGuest,
  MaintenanceWindow,
  TranslateFn,
} from '@/core/types';
import type { MomentFormat } from '@/features/security/model/moment';

export const t: TranslateFn = (key, ...rest) => translate(localeDictionaries.es, key, ...rest);

export const NOW = new Date(2026, 9, 21, 15, 0).getTime();

export const SECONDS = Math.floor(NOW / 1000);

export const format: MomentFormat = {
  t,
  time: (value) =>
    `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`,
  day: () => 'lun',
};

export function environment(overrides: Partial<GuardEnvironment> = {}): GuardEnvironment {
  return {
    id: 1,
    name: 'Casa',
    kind: 'home',
    isDefault: true,
    mode: 'home',
    effectiveMode: 'home',
    occupancy: 'manual',
    publicPresent: false,
    staffOnly: false,
    scheduleEnabled: false,
    asleep: '',
    open: '',
    staffed: '',
    closedMode: 'away',
    digestHour: 21,
    quietPolicy: 'inherit',
    quietStartHour: 22,
    quietEndHour: 7,
    cameraIds: [],
    maskedCameras: [],
    modeUpdatedAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

export function episode(overrides: Partial<GuardEpisode> = {}): GuardEpisode {
  return {
    id: 1,
    kind: 'person',
    cameraId: 3,
    cameraName: 'Patio trasero',
    state: 'resolved',
    stage: 'closed',
    danger: 'medium',
    notified: false,
    notifyCount: 0,
    highestNotified: 'none',
    subject: 'stranger',
    people: 1,
    reasons: [],
    firstSeen: SECONDS - 600,
    lastSeen: SECONDS - 540,
    observations: 3,
    groupId: 0,
    reviewLabel: '',
    reviewedAt: 0,
    resolution: 'left',
    spoke: false,
    sounded: false,
    status: '',
    environmentId: 1,
    ...overrides,
  };
}

export function guest(overrides: Partial<GuardExpectedGuest> = {}): GuardExpectedGuest {
  return {
    id: 1,
    cameraId: 0,
    environmentId: 1,
    personId: 0,
    hostUserId: 1,
    description: 'Técnico de internet',
    oneTime: false,
    validFrom: SECONDS - 3600,
    validUntil: SECONDS + 3 * 3600,
    ...overrides,
  };
}

export function maintenanceWindow(overrides: Partial<MaintenanceWindow> = {}): MaintenanceWindow {
  return {
    id: 4,
    cameraIds: [3],
    environmentId: 1,
    declaredBy: 1,
    declaredByName: 'Ana',
    startedAt: SECONDS - 300,
    endsAt: SECONDS + 900,
    endedAt: null,
    active: true,
    endReason: null,
    duress: false,
    source: 'app',
    viewChecks: [],
    ...overrides,
  };
}
