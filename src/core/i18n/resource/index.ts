import type { SupportedLanguage } from '@/shared/constants';
import en from './en';
import es from './es';

export const resources = {
  en,
  es,
} as const satisfies Record<SupportedLanguage, unknown>;

export type Resources = typeof resources;

export type Namespace = keyof Resources['en'];

export const DEFAULT_NAMESPACE: Namespace = 'common';
