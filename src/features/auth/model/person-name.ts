import type { IApiError } from '@/core/interfaces';
import type { TranslationKey } from '@/core/types';
import {
  LAST_NAME_MAX,
  NAME_MAX,
  NAME_MIN,
  NAME_PATTERN,
  SERVER_PLACEHOLDER_NAMES,
} from '@/features/auth/constants/name.constant';

export type NameField = 'name' | 'lastName';

export type NameErrors = Partial<Record<NameField, TranslationKey>>;

export type PersonName = { name: string; lastName: string };

export type NameCheck = { value: PersonName; errors: NameErrors };

export const tidyName = (raw: string): string => raw.normalize('NFC').trim().replace(/\s+/g, ' ');

const lengthOf = (value: string): number => [...value].length;

function fieldError(value: string, min: number, max: number): TranslationKey | undefined {
  if (lengthOf(value) < min) return 'screens.name.errors.required';
  if (lengthOf(value) > max) return 'screens.name.errors.long';
  if (value.length > 0 && !NAME_PATTERN.test(value)) return 'screens.name.errors.letters';
  return undefined;
}

export function checkName(raw: PersonName): NameCheck {
  const value = { name: tidyName(raw.name), lastName: tidyName(raw.lastName) };
  const name = fieldError(value.name, NAME_MIN, NAME_MAX);
  const lastName = fieldError(value.lastName, 0, LAST_NAME_MAX);
  return { value, errors: { ...(name ? { name } : {}), ...(lastName ? { lastName } : {}) } };
}

export const nameIsValid = (check: NameCheck): boolean => Object.keys(check.errors).length === 0;

const FIELDS: readonly NameField[] = ['name', 'lastName'];

export function refusedFields(error: IApiError | null | undefined): NameErrors {
  const named = FIELDS.filter((field) => (error?.fields?.[field]?.length ?? 0) > 0);
  if (named.length === 0) return {};
  return Object.fromEntries(named.map((field) => [field, 'screens.name.errors.letters']));
}

export function knownName(name: string | null | undefined): string {
  const value = tidyName(name ?? '');
  return SERVER_PLACEHOLDER_NAMES.includes(value) ? '' : value;
}
