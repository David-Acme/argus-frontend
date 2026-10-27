import type { InfoRow } from '@/features/auth/model/info-row';

export const SPLASH_SLOW_MS = 6000;

export const WELCOME_ROWS: readonly InfoRow[] = [
  {
    key: 'home',
    icon: 'shield',
    title: 'screens.welcome.rows.home.title',
    meta: 'screens.welcome.rows.home.meta',
  },
  {
    key: 'day',
    icon: 'cal',
    title: 'screens.welcome.rows.day.title',
    meta: 'screens.welcome.rows.day.meta',
  },
  {
    key: 'talk',
    icon: 'mic',
    title: 'screens.welcome.rows.talk.title',
    meta: 'screens.welcome.rows.talk.meta',
  },
];

export const WELCOME_ROUTES = {
  open: ['index', 'pairing/index'],
  native: [
    'invitation/index',
    'privacy/index',
    'face/index',
    'name/index',
    'permissions/index',
    'modules/index',
    'module-privacy/index',
    'voice/index',
    'ready/index',
  ],
} as const;
