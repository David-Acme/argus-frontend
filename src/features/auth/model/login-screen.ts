import type { TranslationKey } from '@/core/types';

export type LoginPhase = 'loading' | 'waiting-owner' | 'qr' | 'approved' | 'expired' | 'error';

export type LoginHeading = { title: TranslationKey; lead: TranslationKey };

export type LoginAction = 'refresh' | 'retry-owner';

export function loginHeadingOf(phase: LoginPhase, native: boolean): LoginHeading {
  if (phase === 'waiting-owner')
    return { title: 'screens.login.waiting-owner.title', lead: 'screens.login.waiting-owner.lead' };
  if (phase === 'error')
    return { title: 'screens.login.error.title', lead: 'screens.login.error.lead' };
  return native
    ? { title: 'screens.login.title-phone', lead: 'screens.login.lead-phone' }
    : { title: 'screens.login.title', lead: 'screens.login.lead' };
}

export function loginActionOf(
  phase: LoginPhase
): { action: LoginAction; label: TranslationKey } | null {
  if (phase === 'expired') return { action: 'refresh', label: 'screens.login.new-code' };
  if (phase === 'error') return { action: 'retry-owner', label: 'common.retry' };
  if (phase === 'waiting-owner')
    return { action: 'retry-owner', label: 'screens.login.waiting-owner.done' };
  return null;
}

export const showsQr = (phase: LoginPhase): boolean =>
  phase !== 'waiting-owner' && phase !== 'error';
