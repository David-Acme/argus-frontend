import type { IApiError } from '@/core/interfaces';
import type { Setting, SettingsOverview, TranslationKey } from '@/core/types';
import {
  HOME_NAME_KEY,
  HOME_NAME_MAX,
  HOUSEHOLD_OWNER,
} from '@/features/settings/constants/household.constant';

export type HomeNameCheck = { value: string; error: TranslationKey | null };

const CONTROL = /[\p{Cc}\p{Cs}\p{Co}\p{Cn}\p{Zl}\p{Zp}]|(?!‍)\p{Cf}/u;

export const tidyHomeName = (raw: string): string =>
  raw.normalize('NFC').trim().replace(/\s+/g, ' ');

export function checkHomeName(raw: string): HomeNameCheck {
  const value = tidyHomeName(raw);
  if (CONTROL.test(raw)) return { value, error: 'screens.settings.household.errors.invalid' };
  if ([...value].length > HOME_NAME_MAX)
    return { value, error: 'screens.settings.household.errors.long' };
  return { value, error: null };
}

export function refusedHomeName(error: IApiError | null | undefined): TranslationKey | null {
  return (error?.fields?.[HOME_NAME_KEY]?.length ?? 0) > 0
    ? 'screens.settings.household.errors.invalid'
    : null;
}

export function homeNameSettingOf(overview: SettingsOverview): Setting | null {
  const owner = overview.owners.find((candidate) => candidate.service === HOUSEHOLD_OWNER);
  if (!owner?.reachable) return null;
  return owner.settings.find((setting) => setting.key === HOME_NAME_KEY) ?? null;
}
