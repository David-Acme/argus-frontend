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

export type RoleModuleOff = (role: string) => string | null;

const nothingOff: RoleModuleOff = () => null;

const hintOf = (t: TranslateFn, moduleOff: string | null): string | undefined =>
  moduleOff ? t('screens.users.role-module-off', { module: moduleOff }) : undefined;

const activeFirst = <T extends string>(options: MenuOption<T>[]): MenuOption<T>[] =>
  [...options.filter((option) => !option.description), ...options.filter((option) => option.description)];

export const roleOptions = (t: TranslateFn, moduleOff: RoleModuleOff = nothingOff): MenuOption<UserRole>[] =>
  activeFirst(
    (['owner', 'resident', 'guard', 'guest'] as const).map((role) => ({
      value: role,
      label: t(`screens.users.role-${role}`),
      description: hintOf(t, moduleOff(role)),
    }))
  );

export const inviteRoleOptions = (t: TranslateFn, moduleOff: RoleModuleOff = nothingOff): MenuOption<InviteRole>[] =>
  activeFirst(
    (['resident', 'guard', 'guest'] as const).map((role) => {
      const off = moduleOff(role);
      return {
        value: role,
        label: t(`screens.users.role-${role}`),
        description: hintOf(t, off),
        disabled: off !== null,
      };
    })
  );
