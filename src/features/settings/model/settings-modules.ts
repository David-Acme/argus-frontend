import type { SettingsOverview, SettingsOwnerName } from '@/core/types';
import { MODULE_IDS } from '@/shared/constants';

const OWNER_MODULES: Readonly<Partial<Record<SettingsOwnerName, string>>> = {
  vlm: MODULE_IDS.surveillance,
  guard: MODULE_IDS.surveillance,
  camera: MODULE_IDS.surveillance,
};

export const moduleOfOwner = (owner: SettingsOwnerName): string => OWNER_MODULES[owner] ?? MODULE_IDS.core;

export function withActiveOwners(
  overview: SettingsOverview,
  moduleActive: (moduleId: string) => boolean
): SettingsOverview {
  const owners = overview.owners.filter((owner) => moduleActive(moduleOfOwner(owner.service)));
  return owners.length === overview.owners.length ? overview : { ...overview, owners };
}
