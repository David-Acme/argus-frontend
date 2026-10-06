import { isJobOpen, requiredBy } from '@/core/services/modules/module-state';
import type {
  LanguageCode,
  ModuleAction,
  ModuleCatalog,
  ModuleDataOwner,
  ModuleJob,
  ModuleLifecycle,
  ModuleRecord,
  ModuleUninstall,
  TranslateFn,
  TranslationKey,
} from '@/core/types';
import { formatBytes } from './module-text';

export type LifecycleCopy = {
  label: TranslationKey;
  hint: TranslationKey | null;
};

const LIFECYCLE_COPY: Readonly<Record<ModuleLifecycle, LifecycleCopy>> = {
  not_installed: { label: 'screens.modules.lifecycle.not_installed', hint: null },
  active: { label: 'screens.modules.lifecycle.active', hint: null },
  disabled: { label: 'screens.modules.lifecycle.disabled', hint: 'screens.modules.lifecycle.disabled-hint' },
  uninstalled_data_kept: {
    label: 'screens.modules.lifecycle.uninstalled_data_kept',
    hint: 'screens.modules.lifecycle.uninstalled-hint',
  },
};

export const lifecycleCopy = (lifecycle: ModuleLifecycle): LifecycleCopy => LIFECYCLE_COPY[lifecycle];

export type LifecycleChoice = 'install' | 'enable' | 'reinstall' | 'disable' | 'uninstall' | 'erase' | 'pause' | 'resume' | 'cancel' | 'retry';

export type LifecycleButton = {
  choice: LifecycleChoice;
  action: ModuleAction;
  label: TranslationKey;
  tone: 'primary' | 'secondary' | 'quiet';
};

const BUTTON: Readonly<Record<LifecycleChoice, LifecycleButton>> = {
  install: { choice: 'install', action: 'install', label: 'screens.modules.actions.install', tone: 'primary' },
  enable: { choice: 'enable', action: 'install', label: 'screens.modules.actions.enable', tone: 'primary' },
  reinstall: { choice: 'reinstall', action: 'install', label: 'screens.modules.actions.reinstall', tone: 'primary' },
  disable: { choice: 'disable', action: 'disable', label: 'screens.modules.actions.disable', tone: 'secondary' },
  uninstall: { choice: 'uninstall', action: 'uninstall', label: 'screens.modules.actions.uninstall', tone: 'quiet' },
  erase: { choice: 'erase', action: 'uninstall', label: 'screens.modules.actions.erase', tone: 'quiet' },
  pause: { choice: 'pause', action: 'pause', label: 'screens.modules.actions.pause', tone: 'secondary' },
  resume: { choice: 'resume', action: 'resume', label: 'screens.modules.actions.resume', tone: 'primary' },
  cancel: { choice: 'cancel', action: 'cancel', label: 'screens.modules.actions.cancel', tone: 'quiet' },
  retry: { choice: 'retry', action: 'install', label: 'screens.modules.actions.retry', tone: 'primary' },
};

export function lifecycleButtons(module: ModuleRecord): LifecycleButton[] {
  if (module.kind !== 'available') return [];
  const state = module.job?.state;
  if (state === 'failed') {
    return [BUTTON.cancel, { ...BUTTON.retry, action: module.job?.kind === 'install' ? 'install' : 'uninstall' }];
  }
  if (state === 'paused') return [BUTTON.cancel, BUTTON.resume];
  if (isJobOpen(module.job)) return [BUTTON.cancel, BUTTON.pause];
  switch (module.lifecycle) {
    case 'active':
      return [BUTTON.uninstall, BUTTON.disable];
    case 'disabled':
      return [BUTTON.uninstall, BUTTON.enable];
    case 'uninstalled_data_kept':
      return [BUTTON.erase, BUTTON.reinstall];
    case 'not_installed':
      return module.hardware?.verdict === 'insufficient' ? [] : [BUTTON.install];
  }
}

export type UninstallBlock =
  | { kind: 'core' }
  | { kind: 'required'; names: string }
  | { kind: 'busy' }
  | null;

export function uninstallBlock(catalog: ModuleCatalog | null, module: ModuleRecord): UninstallBlock {
  if (module.kind === 'core') return { kind: 'core' };
  const dependants = requiredBy(catalog, module.id);
  if (dependants.length > 0) return { kind: 'required', names: dependants.map((item) => item.name || item.id).join(', ') };
  if (isJobOpen(module.job)) return { kind: 'busy' };
  return null;
}

export const blockMessage = (block: Exclude<UninstallBlock, null>, t: TranslateFn): string =>
  block.kind === 'core'
    ? t('common.errors.module-core')
    : block.kind === 'busy'
      ? t('common.errors.module-busy')
      : t('screens.modules.uninstall.required-by', { names: block.names });

export const holdsData = (module: ModuleRecord, owners: readonly ModuleDataOwner[] | null): boolean =>
  module.hasData ||
  (owners ?? []).some((owner) => owner.bytes > 0 || owner.items.some((item) => item.count > 0));

export type UninstallMode = 'simple' | 'choose' | 'erase';

export function uninstallMode(module: ModuleRecord, owners: readonly ModuleDataOwner[] | null): UninstallMode {
  if (module.lifecycle === 'uninstalled_data_kept') return 'erase';
  const unknown = owners === null || owners.some((owner) => !owner.reachable || !owner.reported);
  return unknown || holdsData(module, owners) ? 'choose' : 'simple';
}

const fold = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, ' ');

export const typedNameMatches = (typed: string, name: string): boolean =>
  fold(name).length > 0 && fold(typed) === fold(name);

export type PurgeGate = {
  typed: string;
  name: string;
};

export const purgeReady = ({ typed, name }: PurgeGate): boolean => typedNameMatches(typed, name);

const DATA_KINDS = [
  'cameras',
  'zones',
  'evidence_photos',
  'camera_actions',
  'environments',
  'episodes',
  'incidents',
  'decisions',
  'expected_guests',
  'visitors',
  'visitor_face_samples',
  'visits',
  'projects',
  'tasks',
  'project_members',
  'calendar_events',
  'calendar_shares',
  'change_history',
] as const;

type DataKind = (typeof DATA_KINDS)[number] | 'items';

const isDataKind = (kind: string): kind is DataKind => (DATA_KINDS as readonly string[]).includes(kind);

const kindOf = (kind: string): DataKind => {
  const code = kind.trim().toLowerCase().replace(/[\s-]+/g, '_');
  return isDataKind(code) ? code : 'items';
};

export function dataSummary(
  owners: readonly ModuleDataOwner[],
  language: LanguageCode,
  t: TranslateFn
): string[] {
  const counts = new Map<DataKind, number>();
  owners.forEach((owner) =>
    owner.items.forEach((item) => {
      const kind = kindOf(item.kind);
      if (item.count > 0) counts.set(kind, (counts.get(kind) ?? 0) + item.count);
    })
  );
  const format = new Intl.NumberFormat(language === 'es' ? 'es-ES' : 'en-US');
  const parts = [...counts.entries()]
    .sort(([left], [right]) => Number(left === 'items') - Number(right === 'items'))
    .map(([kind, count]) => {
      const key: `screens.modules.data.${DataKind}.${'one' | 'other'}` = `screens.modules.data.${kind}.${count === 1 ? 'one' : 'other'}`;
      return t(key, { count: format.format(count) });
    });
  const bytes = owners.reduce((total, owner) => total + owner.bytes, 0);
  if (bytes > 0) parts.push(t('screens.modules.data.bytes', { size: formatBytes(bytes, language) }));
  return parts;
}

export const retryBody = (job: ModuleJob | null): ModuleUninstall | null =>
  job?.kind === 'purge' ? { keepData: false } : job?.kind === 'uninstall' ? { keepData: true } : null;

export type PinStep = 'prompt' | 'invalid' | 'locked' | 'refused';

export function pinStep(code: string | null | undefined): PinStep {
  if (code === 'PIN_REQUIRED') return 'prompt';
  if (code === 'PIN_INVALID') return 'invalid';
  if (code === 'PIN_LOCKED') return 'locked';
  return 'refused';
}
