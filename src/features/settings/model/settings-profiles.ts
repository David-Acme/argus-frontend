import type {
  ProfileApplyResult,
  ProfileChange,
  ProfileKeyResult,
  Setting,
  SettingsOverview,
  SettingsOwner,
  SettingsOwnerName,
  SettingsProfile,
} from '@/core/types';
import {
  defineLens,
  type OptimisticIntentInput,
  type OptimisticLens,
} from '@/shared/libs/optimistic';

export type SettingRowState = {
  owner: SettingsOwnerName;
  setting: Setting;
};

export type ProfileChangeItem = ProfileChange & { owner: SettingsOwnerName };

export type ProfileRefusedItem = ProfileKeyResult & { owner: SettingsOwnerName };

type SettingIntentValues = { value: string };

export function settingRecordId(owner: SettingsOwnerName, key: string): string {
  return `${owner}:${key}`;
}

const settingLens = defineLens<SettingRowState, SettingIntentValues>({
  table: 'setting',
  recordIdOf: (row) => settingRecordId(row.owner, row.setting.key),
  patch: (row, values) =>
    values.value == null || values.value === row.setting.value
      ? row
      : { ...row, setting: { ...row.setting, value: values.value } },
});

export const SETTING_LENSES: readonly OptimisticLens<SettingRowState>[] = [settingLens];

export function settingRows(overview: SettingsOverview): SettingRowState[] {
  return overview.owners.flatMap((owner) =>
    owner.settings.map((setting) => ({ owner: owner.service, setting }))
  );
}

export function withSettingRows(
  overview: SettingsOverview,
  rows: readonly SettingRowState[]
): SettingsOverview {
  const patched = new Map<string, Setting>();
  for (const row of rows) patched.set(settingRecordId(row.owner, row.setting.key), row.setting);
  let changed = false;
  const owners = overview.owners.map((owner) => {
    let ownerChanged = false;
    const settings = owner.settings.map((setting) => {
      const next = patched.get(settingRecordId(owner.service, setting.key)) ?? setting;
      if (next !== setting) ownerChanged = true;
      return next;
    });
    if (!ownerChanged) return owner;
    changed = true;
    return { ...owner, settings };
  });
  return changed ? { owners } : overview;
}

export function withCatalogs(
  overview: SettingsOverview,
  catalogs: readonly SettingsOwner[]
): SettingsOverview {
  if (catalogs.length === 0) return overview;
  return {
    owners: overview.owners.map(
      (owner) => catalogs.find((catalog) => catalog.service === owner.service) ?? owner
    ),
  };
}

export function changedItems(profile: SettingsProfile): ProfileChangeItem[] {
  return profile.owners.flatMap((owner) =>
    owner.changes
      .filter((change) => change.changed)
      .map((change) => ({ ...change, owner: owner.service }))
  );
}

export function canApply(profile: SettingsProfile): boolean {
  return changedItems(profile).some((change) => change.install?.availability !== 'hostOnly');
}

export function profileIntents(
  profile: SettingsProfile
): OptimisticIntentInput<SettingIntentValues>[] {
  return profile.owners
    .filter((owner) => owner.reachable)
    .flatMap((owner) =>
      owner.changes
        .filter((change) => change.changed && change.install?.availability !== 'hostOnly')
        .map((change) => ({
          table: 'setting' as const,
          kind: 'update' as const,
          recordId: settingRecordId(owner.service, change.key),
          values: { value: change.to },
        }))
    );
}

export function refusedItems(result: ProfileApplyResult): ProfileRefusedItem[] {
  return result.owners.flatMap((owner) =>
    owner.results
      .filter((item) => item.status === 'rejected' || item.status === 'unreachable')
      .map((item) => ({ ...item, owner: owner.service }))
  );
}

export function refusedRecordIds(result: ProfileApplyResult): string[] {
  return refusedItems(result).map((item) => settingRecordId(item.owner, item.key));
}

export function returnedCatalogs(result: ProfileApplyResult): SettingsOwner[] {
  return result.owners.flatMap((owner) => (owner.catalog ? [owner.catalog] : []));
}
