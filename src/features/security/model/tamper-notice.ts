import { TAMPER_STATUSES, type TamperStatus, type TranslateFn } from '@/core/types';

type NoticeData = Readonly<Record<string, unknown>>;

export type TamperAlertNotice = {
  kind: 'tamper';
  status: TamperStatus | null;
  group: boolean;
  cameraIds: number[];
  cameraCount: number;
  cameraId: number;
  cameraName: string;
  onsetAt: number;
  seenPersonName: string;
  probableMaintenance: boolean;
  canClaim: boolean;
  incidentId: number;
};

export type TamperAskNotice = {
  kind: 'ask';
  askId: number;
  cameraId: number;
  cameraName: string;
};

export type ViewCheckNotice = {
  kind: 'view-check';
  maintenanceId: number;
  cameraId: number;
  cameraName: string;
};

export type LensNotice = {
  kind: 'lens';
  cameraId: number;
  cameraName: string;
};

export type SightNotice = TamperAlertNotice | TamperAskNotice | ViewCheckNotice | LensNotice;

export const SIGHT_NOTICE_KINDS = [
  'guard_tamper',
  'guard_tamper_ask',
  'maintenance_view_check',
  'camera_maintenance_notice',
] as const;

const STATUS_ALIASES: Readonly<Record<string, TamperStatus>> = { defocused: 'blurred' };

export const TAMPER_STATUS_KEYS = {
  covered: 'covered',
  whiteout: 'whiteout',
  blinded: 'blinded',
  partial_cover: 'partial-cover',
  blurred: 'blurred',
  moved: 'moved',
  dark_sudden: 'dark-sudden',
  unreachable: 'unreachable',
} as const satisfies Record<TamperStatus, string>;

const text = (data: NoticeData, field: string): string => {
  const value = data[field];
  return typeof value === 'string' ? value.trim() : '';
};

const integer = (data: NoticeData, field: string): number => {
  const value = data[field];
  if (typeof value === 'number' && Number.isSafeInteger(value)) return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
  return 0;
};

const flag = (data: NoticeData, field: string): boolean => data[field] === true;

export function tamperStatusOf(value: unknown): TamperStatus | null {
  if (typeof value !== 'string') return null;
  return TAMPER_STATUSES.find((status) => status === value) ?? STATUS_ALIASES[value] ?? null;
}

function idList(data: NoticeData, field: string): number[] {
  const value = data[field];
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is number => typeof id === 'number' && Number.isSafeInteger(id) && id > 0);
}

export function sightNoticeOf(kind: string | null, data: NoticeData): SightNotice | null {
  const cameraId = integer(data, 'cameraId');
  const cameraName = text(data, 'cameraName');
  switch (kind) {
    case 'guard_tamper': {
      const cameraIds = idList(data, 'cameraIds');
      const group = flag(data, 'group');
      return {
        kind: 'tamper',
        status: tamperStatusOf(data.tamperStatus),
        group,
        cameraIds,
        cameraCount: Math.max(integer(data, 'cameraCount'), cameraIds.length, group ? 2 : 1),
        cameraId,
        cameraName,
        onsetAt: integer(data, 'onsetAt'),
        seenPersonName: text(data, 'seenPersonName'),
        probableMaintenance: text(data, 'maintenance') === 'probable',
        canClaim: flag(data, 'canClaim'),
        incidentId: integer(data, 'incidentId'),
      };
    }
    case 'guard_tamper_ask': {
      const askId = integer(data, 'askId');
      return askId > 0 ? { kind: 'ask', askId, cameraId, cameraName } : null;
    }
    case 'maintenance_view_check': {
      const maintenanceId = integer(data, 'maintenanceId');
      return maintenanceId > 0 && cameraId > 0 ? { kind: 'view-check', maintenanceId, cameraId, cameraName } : null;
    }
    case 'camera_maintenance_notice':
      return { kind: 'lens', cameraId, cameraName };
    default:
      return null;
  }
}

export type SightNoticeCopy =
  | { key: 'tamper-group'; count: string }
  | { key: 'tamper-probable'; person: string; camera: string }
  | { key: 'tamper-one'; camera: string; status: TamperStatus | null }
  | { key: 'ask'; camera: string }
  | { key: 'view-check'; camera: string }
  | { key: 'lens'; camera: string };

export function sightNoticeCopy(notice: SightNotice): SightNoticeCopy | null {
  switch (notice.kind) {
    case 'tamper':
      if (notice.group) return { key: 'tamper-group', count: String(notice.cameraCount) };
      if (!notice.cameraName) return null;
      if (notice.probableMaintenance && notice.seenPersonName) {
        return { key: 'tamper-probable', person: notice.seenPersonName, camera: notice.cameraName };
      }
      return { key: 'tamper-one', camera: notice.cameraName, status: notice.status };
    case 'ask':
      return notice.cameraName ? { key: 'ask', camera: notice.cameraName } : null;
    case 'view-check':
      return notice.cameraName ? { key: 'view-check', camera: notice.cameraName } : null;
    case 'lens':
      return notice.cameraName ? { key: 'lens', camera: notice.cameraName } : null;
  }
}

export function evidenceTargetOf(notice: SightNotice | null): { cameraId: number; onsetAt: number } | null {
  if (!notice || notice.kind !== 'tamper') return null;
  if (notice.cameraId <= 0 || notice.onsetAt <= 0) return null;
  return { cameraId: notice.cameraId, onsetAt: notice.onsetAt };
}

export function sightNoticeTitle(copy: SightNoticeCopy, t: TranslateFn): string {
  switch (copy.key) {
    case 'tamper-group':
      return t('screens.security.tamper.lost-group', { count: copy.count });
    case 'tamper-probable':
      return t('screens.security.tamper.probable', { person: copy.person, camera: copy.camera });
    case 'tamper-one':
      return copy.status
        ? t('screens.security.tamper.lost-typed', {
            camera: copy.camera,
            type: t(`screens.security.tamper.status.${TAMPER_STATUS_KEYS[copy.status]}`),
          })
        : t('screens.security.tamper.lost', { camera: copy.camera });
    case 'ask':
      return t('screens.security.tamper.ask-question', { camera: copy.camera });
    case 'view-check':
      return t('screens.security.maintenance.view-question', { name: copy.camera });
    case 'lens':
      return t('screens.security.tamper.lens', { camera: copy.camera });
  }
}
