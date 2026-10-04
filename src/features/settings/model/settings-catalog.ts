import type { Setting, SettingChange, SettingsOverview, SettingsOwner, SettingsOwnerName } from '@/core/types';

export type OwnerStatus = 'connected' | 'unreachable' | 'unconfigured';

export type TechnicalFilter = {
  query: string;
  service: SettingsOwnerName | 'all';
  changed: boolean;
  restart: boolean;
};

export type SettingText = {
  label: string;
  hint: string;
};

export type TechnicalRow = {
  owner: SettingsOwner;
  setting: Setting;
};

export type TechnicalGroup = {
  owner: SettingsOwner;
  rows: TechnicalRow[];
};

export type SettingsExport = {
  format: typeof SETTINGS_EXPORT_FORMAT;
  service: SettingsOwnerName;
  exportedAt: string;
  settings: Record<string, string>;
};

export type ImportRefusal = 'notJson' | 'wrongFormat' | 'wrongService' | 'nothingToChange' | 'tooMany';

export type ImportPlan =
  | {
      ok: true;
      changes: SettingChange[];
      unchanged: number;
      unknown: string[];
    }
  | { ok: false; reason: ImportRefusal; service?: string };

export const SETTINGS_EXPORT_FORMAT = 'argus.settings/1';
export const MAX_IMPORT_CHANGES = 64;

function numeric(setting: Setting): boolean {
  return setting.type === 'integer' || setting.type === 'decimal';
}

export function sameSettingValue(setting: Setting, left: string, right: string): boolean {
  if (!numeric(setting)) return left === right;
  const a = Number(left);
  const b = Number(right);
  if (left.trim() === '' || right.trim() === '' || Number.isNaN(a) || Number.isNaN(b)) return left === right;
  return a === b;
}

export function isChanged(setting: Setting): boolean {
  return !sameSettingValue(setting, setting.value, setting.fallback);
}

export function ownerStatus(owner: SettingsOwner): OwnerStatus {
  if (owner.configured === false) return 'unconfigured';
  return owner.reachable ? 'connected' : 'unreachable';
}

export function disconnectedOwners(overview: SettingsOverview): SettingsOwner[] {
  return overview.owners.filter((owner) => ownerStatus(owner) !== 'connected');
}

export function hasRange(setting: Setting): boolean {
  return numeric(setting) && !(setting.min === 0 && setting.max === 0);
}

function normalized(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

export function matchesQuery(row: TechnicalRow, text: SettingText, ownerName: string, query: string): boolean {
  const terms = normalized(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = normalized(
    [row.setting.key, text.label, text.hint, ownerName, row.owner.service, row.setting.group].join(' ')
  );
  return terms.every((term) => haystack.includes(term));
}

export function technicalGroups(
  overview: SettingsOverview,
  filter: TechnicalFilter,
  describe: (row: TechnicalRow) => SettingText,
  ownerName: (owner: SettingsOwner) => string
): TechnicalGroup[] {
  return overview.owners
    .filter((owner) => filter.service === 'all' || owner.service === filter.service)
    .map((owner) => ({
      owner,
      rows: owner.settings
        .map((setting) => ({ owner, setting }))
        .filter((row) => !filter.changed || isChanged(row.setting))
        .filter((row) => !filter.restart || row.setting.apply === 'restart' || row.setting.pendingRestart === true)
        .filter((row) => matchesQuery(row, describe(row), ownerName(owner), filter.query)),
    }))
    .filter((group) => group.rows.length > 0 || (!filter.changed && !filter.restart && filter.query.trim() === ''));
}

export function overviewCounts(overview: SettingsOverview) {
  const settings = overview.owners.flatMap((owner) => owner.settings);
  return {
    total: settings.length,
    changed: settings.filter(isChanged).length,
    pending: settings.filter((setting) => setting.pendingRestart === true).length,
  };
}

export function pendingRestartKeys(owner: SettingsOwner): string[] {
  return owner.settings.filter((setting) => setting.pendingRestart === true).map((setting) => setting.key);
}

export function exportOwner(owner: SettingsOwner, now: Date): SettingsExport {
  return {
    format: SETTINGS_EXPORT_FORMAT,
    service: owner.service,
    exportedAt: now.toISOString(),
    settings: Object.fromEntries(owner.settings.map((setting) => [setting.key, setting.value])),
  };
}

export function exportText(owner: SettingsOwner, now: Date): string {
  return JSON.stringify(exportOwner(owner, now), null, 2);
}

function parsedJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function planImport(text: string, owner: SettingsOwner): ImportPlan {
  const data = parsedJson(text.trim());
  if (data === undefined) return { ok: false, reason: 'notJson' };
  if (!isRecord(data) || data.format !== SETTINGS_EXPORT_FORMAT || !isRecord(data.settings))
    return { ok: false, reason: 'wrongFormat' };
  if (data.service !== owner.service)
    return { ok: false, reason: 'wrongService', service: typeof data.service === 'string' ? data.service : '' };

  const changes: SettingChange[] = [];
  const unknown: string[] = [];
  let unchanged = 0;
  for (const [key, value] of Object.entries(data.settings)) {
    const setting = owner.settings.find((candidate) => candidate.key === key);
    if (!setting || typeof value !== 'string') {
      unknown.push(key);
      continue;
    }
    if (sameSettingValue(setting, setting.value, value)) {
      unchanged += 1;
      continue;
    }
    changes.push({ key, value });
  }
  if (changes.length === 0) return { ok: false, reason: 'nothingToChange' };
  if (changes.length > MAX_IMPORT_CHANGES) return { ok: false, reason: 'tooMany' };
  return { ok: true, changes, unchanged, unknown };
}

export function fileNameOf(configFile: string | undefined): string {
  if (!configFile) return '';
  const parts = configFile.split('/');
  return parts[parts.length - 1] ?? configFile;
}
