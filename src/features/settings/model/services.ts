import type { Setting, SettingsOverview, SettingsOwner, SettingsOwnerName } from '@/core/types';
import { isChanged, matchesQuery, ownerStatus } from '@/features/settings/model/settings-catalog';
import type { SettingText } from '@/features/settings/model/settings-catalog';

export type SettingMatch = { owner: SettingsOwner; setting: Setting };

export type ServiceSearch = {
  describe: (key: string) => SettingText;
  ownerName: (owner: SettingsOwner) => string;
};

const ORDER: readonly SettingsOwnerName[] = [
  'tts',
  'stt',
  'llm',
  'voice',
  'vlm',
  'camera',
  'guard',
  'notification',
];

const SUMMARY_KEYS: Readonly<Partial<Record<SettingsOwnerName, readonly string[]>>> = {
  tts: ['tts.pocket_voice_es', 'tts.engine_es'],
  stt: ['stt.language', 'stt.engine'],
};

const SUMMARY_SIZE = 2;

const rank = (owner: SettingsOwner): number => {
  const index = ORDER.indexOf(owner.service);
  return index < 0 ? ORDER.length : index;
};

export function serviceOwners(overview: SettingsOverview): SettingsOwner[] {
  return overview.owners
    .filter((owner) => ownerStatus(owner) !== 'unconfigured')
    .sort((left, right) => rank(left) - rank(right));
}

export const basicOf = (owner: SettingsOwner): Setting[] =>
  owner.settings.filter((setting) => setting.level === 'basic');

export const advancedOf = (owner: SettingsOwner): Setting[] =>
  owner.settings.filter((setting) => setting.level !== 'basic');

export const changedOf = (owner: SettingsOwner): Setting[] => owner.settings.filter(isChanged);

export function summaryOf(owner: SettingsOwner): Setting[] {
  const preferred = (SUMMARY_KEYS[owner.service] ?? []).flatMap((key) => {
    const setting = owner.settings.find((candidate) => candidate.key === key);
    return setting ? [setting] : [];
  });
  const choices = basicOf(owner).filter((setting) => setting.type === 'choice');
  return (preferred.length > 0 ? preferred : choices).slice(0, SUMMARY_SIZE);
}

export function searchSettings(
  owners: readonly SettingsOwner[],
  query: string,
  search: ServiceSearch
): SettingMatch[] {
  if (query.trim() === '') return [];
  return owners.flatMap((owner) =>
    owner.settings
      .filter((setting) =>
        matchesQuery(
          { owner, setting },
          search.describe(setting.key),
          search.ownerName(owner),
          query
        )
      )
      .map((setting) => ({ owner, setting }))
  );
}

export function matchingOwners(
  owners: readonly SettingsOwner[],
  query: string,
  search: ServiceSearch
): SettingsOwner[] {
  if (query.trim() === '') return [...owners];
  const hits = new Set(searchSettings(owners, query, search).map((match) => match.owner.service));
  const named = owners.filter((owner) =>
    search.ownerName(owner).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
  );
  return owners.filter((owner) => hits.has(owner.service) || named.includes(owner));
}

export const reachableCount = (owners: readonly SettingsOwner[]): number =>
  owners.filter((owner) => owner.reachable).length;
