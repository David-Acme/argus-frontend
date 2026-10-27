import type { InviteRole, TranslationKey } from '@/core/types';

export const INVITE_ROLES: readonly InviteRole[] = ['resident', 'guard', 'guest'];

export const PEOPLE_HREF = {
  list: '/users',
  directory: '/people',
  person: '/people/[id]',
  visitors: '/users/visitors',
  profile: '/profile',
} as const;

export const INVITE_PARAM = '1';

export const ACCOUNT_WORDS = {
  enable: {
    title: 'screens.sessions.admin.confirm-enable-title',
    body: 'screens.sessions.admin.confirm-enable-description',
    confirm: 'screens.sessions.admin.enable',
    done: 'screens.sessions.admin.enabled',
  },
  disable: {
    title: 'screens.sessions.admin.confirm-disable-title',
    body: 'screens.sessions.admin.confirm-disable-description',
    confirm: 'screens.sessions.admin.disable',
    done: 'screens.sessions.admin.disabled',
  },
} as const satisfies Record<'enable' | 'disable', Record<string, TranslationKey>>;
