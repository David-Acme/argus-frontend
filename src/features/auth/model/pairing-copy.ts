import type { TranslationKey } from '@/core/types';

export type PairingCopy = { subtitle: TranslationKey; requirement: TranslationKey };

export function pairingCopy(native: boolean): PairingCopy {
  return native
    ? { subtitle: 'screens.pairing.subtitle', requirement: 'screens.pairing.requirement' }
    : { subtitle: 'screens.pairing.subtitle-desktop', requirement: 'screens.pairing.requirement-desktop' };
}
