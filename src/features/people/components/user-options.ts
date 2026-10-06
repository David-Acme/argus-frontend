import type { IPeopleDirectoryCacheRow } from '@/core/interfaces';
import type { InviteRole, MenuOption, TranslateFn, UserRole } from '@/core/types';

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
  role: InviteRole;
  expiresAt: number;
  value: string;
};

export type RoleOffer = (role: string) => boolean;

const everyRole: RoleOffer = () => true;

export const roleOptions = (
  t: TranslateFn,
  offered: RoleOffer = everyRole,
  keep?: UserRole
): MenuOption<UserRole>[] =>
  (
    [
      { value: 'owner', label: t('screens.users.role-owner') },
      { value: 'resident', label: t('screens.users.role-resident') },
      { value: 'guard', label: t('screens.users.role-guard') },
      { value: 'guest', label: t('screens.users.role-guest') },
    ] satisfies MenuOption<UserRole>[]
  ).filter((option) => option.value === keep || offered(option.value));

export const inviteRoleOptions = (t: TranslateFn, offered: RoleOffer = everyRole): MenuOption<InviteRole>[] =>
  (
    [
      { value: 'resident', label: t('screens.users.role-resident') },
      { value: 'guard', label: t('screens.users.role-guard') },
      { value: 'guest', label: t('screens.users.role-guest') },
    ] satisfies MenuOption<InviteRole>[]
  ).filter((option) => offered(option.value));
