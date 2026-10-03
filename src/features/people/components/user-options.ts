

import type { IPeopleDirectoryCacheRow } from '@/core/interfaces';
import type { InviteRole, MenuOption, TranslateFn, UserRole } from '@/core/types';

export const INVITE_EXPIRIES = [
  { value: '1', days: 1 },
  { value: '7', days: 7 },
  { value: '30', days: 30 },
] as const;

export type InviteExpiry = (typeof INVITE_EXPIRIES)[number]['value'];

export type ManagedUserDialogProps = {
  user: IPeopleDirectoryCacheRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

export type InvitationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (preview: InvitationPreview) => void;
  onSaved: () => void;
};

export type InvitationPreview = {
  invitationId: number;
  value: string;
};

export const roleOptions = (t: TranslateFn): MenuOption<UserRole>[] => [
  { value: 'owner', label: t('screens.users.role-owner') },
  { value: 'resident', label: t('screens.users.role-resident') },
  { value: 'guard', label: t('screens.users.role-guard') },
  { value: 'guest', label: t('screens.users.role-guest') },
];

export const inviteRoleOptions = (t: TranslateFn): MenuOption<InviteRole>[] => [
  { value: 'resident', label: t('screens.users.role-resident') },
  { value: 'guard', label: t('screens.users.role-guard') },
  { value: 'guest', label: t('screens.users.role-guest') },
];
