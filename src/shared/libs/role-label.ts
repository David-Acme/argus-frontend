import type { TranslateFn } from '@/core/types';

export function roleLabelOf(role: string, t: TranslateFn): string {
  switch (role) {
    case 'owner':
      return t('screens.users.role-owner');
    case 'resident':
      return t('screens.users.role-resident');
    case 'guard':
      return t('screens.users.role-guard');
    case 'guest':
      return t('screens.users.role-guest');
    default:
      return t('screens.users.role-unknown');
  }
}
