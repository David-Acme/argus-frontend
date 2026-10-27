import type { InfoRow } from '@/features/auth/model/info-row';

export const PAIRED_PAUSE_MS = 700;

export const NAMED_PAUSE_MS = 1400;

export const HOME_NAME_WAIT_MS = 1500;

export const WHERE_ROWS: readonly InfoRow[] = [
  {
    key: 'screen',
    icon: 'screen',
    title: 'screens.pairing.where.screen.title',
    meta: 'screens.pairing.where.screen.meta',
  },
  {
    key: 'box',
    icon: 'key',
    title: 'screens.pairing.where.box.title',
    meta: 'screens.pairing.where.box.meta',
  },
];

export const MISMATCH_ROWS: readonly InfoRow[] = [
  {
    key: 'check',
    icon: 'screen',
    title: 'screens.pairing.mismatch.check.title',
    meta: 'screens.pairing.mismatch.check.meta',
  },
  {
    key: 'ask',
    icon: 'users',
    title: 'screens.pairing.mismatch.ask.title',
    meta: 'screens.pairing.mismatch.ask.meta',
  },
];
